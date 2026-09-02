import { Institute } from '../institutes/institute.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Application } from '../applications/application.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/index.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';
import { SYSTEM_SERVICE_KEYS } from '../../shared/constants/systemServices.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { getOfferingCompleteness } from '../../shared/helpers/offeringCompleteness.helper.js';
import { validateApplicantDetails } from '../../shared/helpers/applicantFields.helper.js';
import { normalizeMobileNumber, formatPhoneForDisplay } from '../../shared/helpers/phone.helper.js';
import {
  findDocumentRequirement,
  findApplicationDocument,
  formatDocumentRequirements,
  formatIntakeDocumentConfig,
  getDocumentUploadProgress,
  getIntakeDocumentRequirement,
  getMissingRequiredDocuments,
  validateUploadedFile,
} from '../../shared/helpers/applicationDocument.helper.js';
import { streamDocumentFile } from '../applications/application.service.js';
import {
  deleteStoredApplicationDocument,
  persistUploadedApplicationFile,
  removeStoredApplicationFile,
} from '../../shared/services/applicationFile.storage.js';
import { notifyEnrollmentIntakeReceived, notifyApplicationSubmitted, notifyApplicationStatusChange } from '../../shared/templates/applicationEmails.js';
import { emitApplicationUpdated, emitDashboardUpdated } from '../../shared/helpers/realtime.helper.js';
import { createNotification } from '../notifications/notification.service.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import {
  assertBeforeSubmitPaymentComplete,
  formatPaymentConfig,
  getApplicationPaymentState,
  unlockWorkflowPaymentAfterVisit,
} from '../payments/payment.service.js';
import { getVisitPlanningForStudent } from '../appointments/appointment.service.js';
import {
  formatWorkflowForClient,
  snapshotOfferingWorkflow,
} from '../../shared/helpers/workflowExecution.helper.js';
import { settleAiWorkflowSteps } from '../ai-verification/ai-step.helper.js';
import {
  enqueueApplicationAiVerification,
  enqueueIntakeAiPrescreen,
} from '../../core/queues/ai-verification.queue.js';
import { isAiVerificationEnabled } from '../ai-verification/ai-verification.config.js';
import { refreshApplicationRuntime } from '../../shared/services/applicationRuntime.service.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  buildStudentEligibilityProfile,
  evaluateEligibilityRules,
} from '../../shared/helpers/eligibilityEvaluation.helper.js';
import { resolveStudentPortalInstituteId } from '../../shared/helpers/studentPortalInstitute.helper.js';
import { fuzzyFilterByName } from '../../shared/helpers/fuzzySearch.helper.js';
import {
  isWithinOfferingDates,
  offeringDateQueryBounds,
} from '../../shared/helpers/offeringDates.helper.js';

function isStudentVisibleOffering(offering) {
  // Student portal shows only Active offerings (within date window if set).
  return offering.status === OFFERING_STATUS.ACTIVE && isWithinOfferingDates(offering);
}

function studentVisibleOfferingQuery(instituteId, serviceId) {
  return {
    instituteId,
    ...(serviceId ? { serviceId } : {}),
    status: OFFERING_STATUS.ACTIVE,
    ...offeringDateQueryBounds(),
  };
}

/**
 * Public programme catalogue: every Active offering under Active services for this institute.
 * @param {string} instituteId
 * @returns {Promise<Array<{ offering: import('mongoose').Document, service: import('mongoose').Document }>>}
 */
async function loadPublicProgrammeRows(instituteId) {
  const services = await Service.find({
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
  }).sort({ name: 1 });

  if (!services.length) return [];

  const serviceById = new Map(services.map((s) => [s._id.toString(), s]));
  const offerings = await Offering.find(studentVisibleOfferingQuery(instituteId)).sort({ name: 1 });

  return offerings
    .filter(isStudentVisibleOffering)
    .map((offering) => {
      const service = serviceById.get(offering.serviceId.toString());
      if (!service) return null;
      return { offering, service };
    })
    .filter(Boolean);
}

function formatWorkflowStep(step) {
  const outcomeActions = (step.outcomes ?? [])
    .map((outcome) => outcome.route?.action)
    .filter(Boolean);

  return {
    stepId: step.stepId,
    order: step.order,
    name: step.name,
    description: step.description,
    handledBy: step.handledBy,
    slaValue: step.slaValue,
    slaUnit: step.slaUnit,
    allowedActions: step.allowedActions?.length ? step.allowedActions : outcomeActions,
  };
}

function formatStudentOffering(offering, options = {}) {
  const completeness = getOfferingCompleteness(offering);
  return {
    id: offering._id.toString(),
    serviceId: offering.serviceId?.toString?.() ?? offering.serviceId ?? null,
    serviceName: options.serviceName ?? null,
    isEnrollmentService: options.isEnrollmentService === true,
    name: offering.name,
    description: offering.description ?? '',
    visitLocation: offering.visitLocation ?? '',
    visitInstructions: offering.visitInstructions ?? '',
    status: offering.status,
    startDate: offering.startDate,
    endDate: offering.endDate,
    eligibilityRules: offering.eligibilityRules ?? [],
    documentRequirements: formatDocumentRequirements(offering.documentRequirements),
    workflowSteps: (offering.workflowSteps ?? []).map(formatWorkflowStep),
    queueMode: offering.queueMode ?? null,
    queueConfig: offering.queueConfig ?? null,
    appointmentConfig: offering.appointmentConfig ?? null,
    applicantFields: offering.applicantFields ?? [],
    intakeDocument: formatIntakeDocumentConfig(offering.intakeDocument),
    paymentConfig: formatPaymentConfig(offering.paymentConfig),
    completeness: {
      isComplete: completeness.isComplete,
      missing: completeness.missing,
    },
    ...(options.enrolledOfferingId
      ? { isEnrolledProgramme: options.enrolledOfferingId === offering._id.toString() }
      : {}),
  };
}

/**
 * @param {string} instituteId
 */
export async function assertStudentPortalInstitute(instituteId) {
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    throw new AppError('Institute not found', 404);
  }
  if (!institute.setupCompleted) {
    throw new AppError('This institute is not available on the student portal yet', 404);
  }
  return institute;
}

/**
 * @param {{ search?: string, limit?: number }} [query]
 */
async function loadStudentPortalInstitutes(query = {}) {
  const limit = query.limit ?? 20;
  const search = query.search?.trim() ?? '';
  const institutes = await Institute.find({ setupCompleted: true }).sort({ name: 1 });

  const formatted = await Promise.all(
    institutes.map(async (institute) => {
      const instituteId = institute._id.toString();
      const rows = await loadPublicProgrammeRows(institute._id);
      const openProgrammeCount = rows.length;

      return {
        id: instituteId,
        name: institute.name,
        hasEnrollment: rows.length > 0,
        openProgrammeCount,
      };
    }),
  );

  const total = formatted.length;

  if (search) {
    const institutes = fuzzyFilterByName(formatted, search, { limit: 50 });
    return {
      institutes,
      total,
      showing: institutes.length,
      isSearch: true,
      search,
    };
  }

  return {
    institutes: formatted.slice(0, limit),
    total,
    showing: Math.min(limit, total),
    isSearch: false,
    search: '',
  };
}

export async function listStudentPortalInstitutes(query = {}) {
  return cachedRead(cacheNs.STUDENT_INSTITUTES, [query.search ?? '', query.limit ?? 20], () =>
    loadStudentPortalInstitutes(query),
  );
}

/**
 * @returns {Promise<string>}
 * @deprecated Use an explicit institute id from the student portal selection flow.
 */
export async function resolveStudentInstituteId() {
  return resolveStudentPortalInstituteId();
}

/**
 * @param {string} instituteId
 */
export async function getInstitutePublicProfile(instituteId) {
  return cachedRead(cacheNs.STUDENT_INSTITUTE_PROFILE, [instituteId], async () => {
    const institute = await assertStudentPortalInstitute(instituteId);

    return {
      id: institute._id.toString(),
      name: institute.name,
    };
  });
}

/**
 * @param {string} instituteId
 */
async function getEnrollmentService(instituteId) {
  const service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });
  if (!service) {
    throw new AppError('Enrollment service is not configured for this institute', 404);
  }
  return service;
}

/**
 * @param {string} instituteId
 */
async function loadEnrollmentOfferings(instituteId) {
  const rows = await loadPublicProgrammeRows(instituteId);
  return rows.map(({ offering, service }) =>
    formatStudentOffering(offering, {
      serviceName: service.name,
      isEnrollmentService: service.systemKey === SYSTEM_SERVICE_KEYS.ENROLLMENT,
    }),
  );
}

/**
 * @param {string} instituteId
 */
export async function listEnrollmentOfferings(instituteId) {
  return cachedRead(cacheNs.STUDENT_OFFERINGS, [instituteId], () =>
    loadEnrollmentOfferings(instituteId),
  );
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getEnrollmentOfferingDetail(offeringId, instituteId) {
  return cachedRead(cacheNs.STUDENT_OFFERING_DETAIL, [instituteId, offeringId], async () => {
    await assertStudentPortalInstitute(instituteId);
    const rows = await loadPublicProgrammeRows(instituteId);
    const row = rows.find((item) => item.offering._id.toString() === offeringId);

    if (!row) {
      throw new AppError('Programme offering not found', 404);
    }

    return formatStudentOffering(row.offering, {
      serviceName: row.service.name,
      isEnrollmentService: row.service.systemKey === SYSTEM_SERVICE_KEYS.ENROLLMENT,
    });
  });
}

const ACTIVE_ENROLLMENT_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.PENDING_AUTHORIZATION,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.NEEDS_CORRECTION,
  APPLICATION_STATUS.ADMITTED,
];

async function notifyInstituteTeamOfEnrollmentIntake(application, context) {
  const recipients = await User.find({
    instituteId: application.instituteId,
    role: { $in: [ROLES.ADMIN, ROLES.STAFF] },
    isActive: true,
  }).select('_id role');

  const applicationId = application._id.toString();
  const adminLink = `/admin/enrollment-intakes/${applicationId}`;
  const staffLink = `/staff/enrollment-intakes/${applicationId}`;

  await Promise.all(
    recipients.map((user) =>
      createNotification({
        instituteId: application.instituteId.toString(),
        userId: user._id.toString(),
        type: 'status',
        title: 'New enrollment intake',
        body: `${application.applicantName} requested to start ${context.offeringName}. Review authorization.`,
        link: user.role === ROLES.STAFF ? staffLink : adminLink,
        metadata: {
          applicationId,
          status: application.status,
          source: 'enrollment_intake',
        },
      }),
    ),
  );
}

async function recordEnrollmentIntake(application, offering, instituteId) {
  application.status = APPLICATION_STATUS.PENDING_AUTHORIZATION;
  application.currentStepId = offering.workflowSteps?.[0]?.stepId ?? null;
  application.configurationVersion = undefined;
  application.workflowSnapshot = [];
  application.workflowHistory = [];
  application.correctionNote = undefined;
  application.correctionRequiredDocuments = [];
  application.assignedTo = undefined;
  application.assignedAt = undefined;
  application.assignedBy = undefined;
  await application.save();

  const institute = await Institute.findById(instituteId).select('name');
  const service = await Service.findById(application.serviceId).select('name');
  const emailContext = {
    serviceName: service?.name ?? 'Enrollment',
    offeringName: offering.name,
    instituteName: institute?.name ?? 'Your institute',
  };

  notifyEnrollmentIntakeReceived(application, emailContext).catch((err) => {
    logger.error({ err, applicationId: application._id }, 'Failed to queue enrollment intake received email');
  });

  await notifyInstituteTeamOfEnrollmentIntake(application, {
    offeringName: offering.name,
    serviceName: emailContext.serviceName,
  });

  emitApplicationUpdated({
    instituteId,
    applicationId: application._id.toString(),
    studentUserId: null,
    assigneeUserId: null,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      applicantName: application.applicantName,
      updatedAt: application.updatedAt,
    },
  });

  emitDashboardUpdated(instituteId);

  if (isAiVerificationEnabled()) {
    await enqueueIntakeAiPrescreen(instituteId, application._id.toString()).catch(() => {});
  }

  return emailContext;
}

/**
 * @param {import('../applications/application.model.js').Application} application
 * @param {import('../offerings/offering.model.js').Offering} offering
 * @param {Express.Multer.File | undefined} file
 */
async function attachIntakeDocumentToApplication(application, offering, file) {
  const requirement = getIntakeDocumentRequirement(offering);
  if (!requirement) {
    if (file) {
      await removeStoredApplicationFile(file.path);
    }
    return;
  }

  if (!file) {
    if (requirement.required !== false) {
      throw new AppError(`${requirement.name} is required`, 400);
    }
    return;
  }

  const validationError = validateUploadedFile(requirement, file);
  if (validationError) {
    await removeStoredApplicationFile(file.path);
    throw new AppError(validationError, 400);
  }

  const requirementId = requirement._id.toString();
  const existingIndex = application.documents.findIndex(
    (document) => document.requirementId.toString() === requirementId,
  );
  if (existingIndex >= 0) {
    await deleteStoredApplicationDocument(application.documents[existingIndex]);
    application.documents.splice(existingIndex, 1);
  }

  const stored = await persistUploadedApplicationFile(file);
  application.documents.push({
    requirementId: requirement._id,
    requirementName: requirement.name,
    ...stored,
  });
}

/**
 * @param {string} instituteId
 * @param {{ offeringId: string, applicantName: string, applicantEmail: string, applicantMobile: string, applicantDetails?: Record<string, unknown> }} payload
 * @param {Express.Multer.File | undefined} intakeDocumentFile
 */
export async function createEnrollmentApplication(instituteId, payload, intakeDocumentFile) {
  const offering = await Offering.findOne({
    ...studentVisibleOfferingQuery(instituteId),
    _id: payload.offeringId,
  });

  if (!offering || !isStudentVisibleOffering(offering)) {
    if (intakeDocumentFile) {
      await removeStoredApplicationFile(intakeDocumentFile.path);
    }
    throw new AppError('Programme offering not found', 404);
  }

  const service = await Service.findOne({
    _id: offering.serviceId,
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
  });
  if (!service) {
    if (intakeDocumentFile) {
      await removeStoredApplicationFile(intakeDocumentFile.path);
    }
    throw new AppError('Service not found for this programme', 404);
  }

  const mobileResult = normalizeMobileNumber(payload.applicantMobile);
  if (!mobileResult.valid) {
    if (intakeDocumentFile) {
      await removeStoredApplicationFile(intakeDocumentFile.path);
    }
    throw new AppError(mobileResult.error, 400);
  }

  const { details, errors } = validateApplicantDetails(
    offering.applicantFields,
    payload.applicantDetails ?? {},
  );
  if (errors.length) {
    if (intakeDocumentFile) {
      await removeStoredApplicationFile(intakeDocumentFile.path);
    }
    throw new AppError(errors[0], 400);
  }

  const email = payload.applicantEmail.toLowerCase();
  const existingStudent = await User.findOne({
    email,
    instituteId,
    role: ROLES.STUDENT,
    isActive: true,
  }).select('_id');
  if (existingStudent) {
    if (intakeDocumentFile) {
      await removeStoredApplicationFile(intakeDocumentFile.path);
    }
    throw new AppError(
      'This email is already registered as a student. Enter a different email, or log in to the student portal.',
      409,
    );
  }

  const existing = await Application.findOne({
    instituteId,
    serviceId: service._id,
    offeringId: offering._id,
    applicantEmail: email,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
  });

  if (existing) {
    if (existing.status === APPLICATION_STATUS.PENDING_AUTHORIZATION && !intakeDocumentFile) {
      throw new AppError(
        'This email already has a pending authorization request. Enter a different email, or wait for the institute to review it.',
        409,
      );
    }
    if (
      existing.status !== APPLICATION_STATUS.DRAFT &&
      existing.status !== APPLICATION_STATUS.PENDING_AUTHORIZATION
    ) {
      if (intakeDocumentFile) {
        await removeStoredApplicationFile(intakeDocumentFile.path);
      }
      throw new AppError(
        'This email already has an application for this programme. Enter a different email.',
        400,
      );
    }
  }

  let application = existing;
  if (!application) {
    application = await Application.create({
      instituteId,
      serviceId: service._id,
      offeringId: offering._id,
      applicantName: payload.applicantName.trim(),
      applicantEmail: email,
      applicantMobile: mobileResult.value,
      applicantDetails: details,
      status: APPLICATION_STATUS.PENDING_AUTHORIZATION,
      currentStepId: offering.workflowSteps?.[0]?.stepId ?? null,
    });
  } else {
    application.applicantName = payload.applicantName.trim();
    application.applicantMobile = mobileResult.value;
    application.applicantDetails = details;
  }

  try {
    await attachIntakeDocumentToApplication(application, offering, intakeDocumentFile);
  } catch (error) {
    if (!existing) {
      await Application.deleteOne({ _id: application._id });
    }
    throw error;
  }

  await application.save();
  await recordEnrollmentIntake(application, offering, instituteId);

  await flushInstituteReadCache(instituteId);
  return {
    id: application._id.toString(),
    status: application.status,
    offeringId: offering._id.toString(),
    offeringName: offering.name,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: application.applicantMobile,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

/**
 * @param {string} instituteId
 * @param {string} offeringId
 * @param {string} email
 */
export async function getEnrollmentIntakeStatus(instituteId, offeringId, email) {
  return cachedRead(cacheNs.STUDENT_INTAKE_STATUS, [instituteId, offeringId, email], async () => {
    await assertStudentPortalInstitute(instituteId);

    const offering = await Offering.findOne({
      _id: offeringId,
      instituteId,
    }).select('serviceId');

    const normalizedEmail = email.toLowerCase();
    const [application, existingStudent] = await Promise.all([
      Application.findOne({
        instituteId,
        ...(offering ? { serviceId: offering.serviceId } : {}),
        offeringId,
        applicantEmail: normalizedEmail,
      }).select('status applicantName createdAt updatedAt'),
      User.findOne({
        email: normalizedEmail,
        instituteId,
        role: ROLES.STUDENT,
        isActive: true,
      }).select('_id'),
    ]);

    if (existingStudent) {
      return {
        hasIntake: Boolean(application),
        canSubmit: false,
        status: application?.status ?? 'existing_student',
        message:
          'This email is already registered as a student. Enter a different email, or log in to the student portal.',
        submittedAt: application?.updatedAt ?? null,
      };
    }

    if (!application) {
      return {
        hasIntake: false,
        canSubmit: true,
        status: null,
        message: null,
      };
    }

    if (application.status === APPLICATION_STATUS.PENDING_AUTHORIZATION) {
      return {
        hasIntake: true,
        canSubmit: false,
        status: application.status,
        message:
          'This email already has a pending authorization request. Enter a different email, or wait for the institute to review it.',
        submittedAt: application.createdAt,
      };
    }

    if (application.status === APPLICATION_STATUS.REJECTED) {
      return {
        hasIntake: true,
        canSubmit: true,
        status: application.status,
        message:
          'Your previous authorization request was not approved. You may submit a new request below.',
        submittedAt: application.updatedAt,
      };
    }

    return {
      hasIntake: true,
      canSubmit: false,
      status: application.status,
      message: 'This email already has an application for this programme. Enter a different email.',
      submittedAt: application.updatedAt,
    };
  });
}

export async function listStudentApplications(instituteId, userEmail) {
  return cachedRead(cacheNs.STUDENT_APPLICATIONS, [instituteId, userEmail], async () => {
  const applications = await Application.find({
    instituteId,
    applicantEmail: userEmail.toLowerCase(),
  }).sort({ updatedAt: -1 });

  if (!applications.length) {
    return [];
  }

  const serviceIds = [...new Set(applications.map((item) => item.serviceId.toString()))];
  const offeringIds = [...new Set(applications.map((item) => item.offeringId.toString()))];

  const [services, offerings] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } }).select('name systemKey'),
    Offering.find({ _id: { $in: offeringIds } }).select('name documentRequirements'),
  ]);

  const serviceMap = new Map(services.map((item) => [item._id.toString(), item]));
  const offeringMap = new Map(offerings.map((item) => [item._id.toString(), item]));

  return applications
    .filter((application) => serviceMap.has(application.serviceId.toString()))
    .map((application) => {
      const service = serviceMap.get(application.serviceId.toString());
      const offering = offeringMap.get(application.offeringId.toString());
      const progress = offering
        ? getDocumentUploadProgress(offering, application)
        : { documentsComplete: false, uploadedRequiredCount: 0, requiredDocumentCount: 0 };

      return {
        id: application._id.toString(),
        status: application.status,
        serviceId: application.serviceId.toString(),
        serviceName: service?.name ?? 'Service',
        offeringId: application.offeringId.toString(),
        offeringName: offering?.name ?? 'Option',
        updatedAt: application.updatedAt,
        documentsComplete: progress.documentsComplete,
        uploadedRequiredCount: progress.uploadedRequiredCount,
        requiredDocumentCount: progress.requiredDocumentCount,
        correctionNote: application.correctionNote ?? '',
      };
    });
  });
}

function assertStudentEligible(offering, user) {
  const rules = offering.eligibilityRules ?? [];
  if (!rules.length) return;

  const profile = buildStudentEligibilityProfile(user);
  const evaluation = evaluateEligibilityRules(rules, profile);

  if (!evaluation.eligible) {
    throw new AppError(
      `You do not meet the eligibility requirements for this option: ${evaluation.failures.join(', ')}`,
      400,
    );
  }
}

async function assertStudentEligibleForUser(offering, user, instituteId) {
  const rules = offering.eligibilityRules ?? [];
  if (!rules.length) return;

  let profileUser = user;
  if (!user.enrolledProgrammeName && user.enrolledOfferingId) {
    const enrolledOffering = await Offering.findOne({
      _id: user.enrolledOfferingId,
      instituteId,
    }).select('name');
    profileUser = {
      ...user,
      enrolledProgrammeName: enrolledOffering?.name ?? null,
    };
  }

  assertStudentEligible(offering, profileUser);
}

/**
 * @param {string} instituteId
 * @param {string} [enrolledOfferingId]
 */
async function loadStudentServices(instituteId, enrolledOfferingId) {
  const results = [];

  if (enrolledOfferingId) {
    const enrollmentService = await Service.findOne({
      instituteId,
      status: SERVICE_STATUS.ACTIVE,
      systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
    });

    if (enrollmentService) {
      const offering = await Offering.findOne({
        _id: enrolledOfferingId,
        instituteId,
        serviceId: enrollmentService._id,
      });

      if (offering && isStudentVisibleOffering(offering)) {
        results.push({
          id: enrollmentService._id.toString(),
          name: enrollmentService.name,
          description:
            enrollmentService.description ||
            'Continue your programme admission, upload documents, and pay fees.',
          offeringCount: 1,
          isEnrollmentService: true,
          offerings: [formatStudentOffering(offering, { enrolledOfferingId })],
        });
      }
    }
  }

  const services = await Service.find({
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
    systemKey: { $ne: SYSTEM_SERVICE_KEYS.ENROLLMENT },
  }).sort({ name: 1 });

  for (const service of services) {
    const offerings = await Offering.find(studentVisibleOfferingQuery(instituteId, service._id))
      .sort({ name: 1 });
    const visibleOfferings = offerings.filter(isStudentVisibleOffering);

    if (!visibleOfferings.length) continue;

    results.push({
      id: service._id.toString(),
      name: service.name,
      description: service.description ?? '',
      offeringCount: visibleOfferings.length,
      offerings: visibleOfferings.map((offering) =>
        formatStudentOffering(offering, { enrolledOfferingId }),
      ),
    });
  }

  return results;
}

export async function listStudentServices(instituteId, enrolledOfferingId) {
  return cachedRead(cacheNs.STUDENT_SERVICES, [instituteId, enrolledOfferingId ?? 'none'], () =>
    loadStudentServices(instituteId, enrolledOfferingId),
  );
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {{ email?: string, enrolledOfferingId?: string } | string} [userOrEmail]
 */
export async function getStudentServiceDetail(serviceId, instituteId, userOrEmail) {
  const user =
    typeof userOrEmail === 'string' || userOrEmail == null
      ? { email: userOrEmail ?? undefined, enrolledOfferingId: undefined }
      : userOrEmail;
  const studentEmail = user.email;
  const enrolledOfferingId = user.enrolledOfferingId?.toString?.() ?? user.enrolledOfferingId;

  return cachedRead(
    cacheNs.STUDENT_SERVICE_DETAIL,
    [instituteId, serviceId, studentEmail ?? 'anonymous', enrolledOfferingId ?? 'none'],
    async () => {
      const service = await Service.findOne({
        _id: serviceId,
        instituteId,
        status: SERVICE_STATUS.ACTIVE,
      });

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      const isEnrollmentService = service.systemKey === SYSTEM_SERVICE_KEYS.ENROLLMENT;
      if (isEnrollmentService && !enrolledOfferingId) {
        throw new AppError('Service not found', 404);
      }

      const offeringQuery = studentVisibleOfferingQuery(instituteId, service._id);
      const offerings = isEnrollmentService
        ? await Offering.find({ ...offeringQuery, _id: enrolledOfferingId }).sort({ name: 1 })
        : await Offering.find(offeringQuery).sort({ name: 1 });
      const visibleOfferings = offerings.filter(isStudentVisibleOffering);

      const applications = studentEmail
        ? await Application.find({
            instituteId,
            serviceId,
            applicantEmail: studentEmail.toLowerCase(),
          })
        : [];
      const applicationByOffering = new Map(
        await Promise.all(
          applications.map(async (application) => {
            const offering = visibleOfferings.find(
              (item) => item._id.toString() === application.offeringId.toString(),
            );
            const enriched = offering
              ? await enrichStudentApplication(application, offering)
              : formatStudentApplication(application);
            return [application.offeringId.toString(), enriched];
          }),
        ),
      );

      return {
        id: service._id.toString(),
        name: service.name,
        description: service.description ?? '',
        offerings: visibleOfferings.map((offering) => ({
          ...formatStudentOffering(offering),
          application: applicationByOffering.get(offering._id.toString()) ?? null,
        })),
      };
    },
  );
}

/**
 * @param {import('../applications/application.model.js').Application} application
 */
function formatStudentApplication(application) {
  return {
    id: application._id.toString(),
    status: application.status,
    offeringId: application.offeringId.toString(),
    currentStepId: application.currentStepId ?? null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    applicantDetails: application.applicantDetails ?? [],
    documents: (application.documents ?? []).map((document) => ({
      id: document._id.toString(),
      requirementId: document.requirementId.toString(),
      requirementName: document.requirementName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
    })),
  };
}

async function enrichStudentApplication(application, offering) {
  const workflowSteps = application.workflowSnapshot?.length
    ? formatWorkflowForClient(application, { role: ROLES.STUDENT })
    : null;

  const visitPlanning = await getVisitPlanningForStudent(application, offering);
  if (visitPlanning.state === 'completed') {
    const unlockResult = await unlockWorkflowPaymentAfterVisit(
      application,
      offering,
      application.instituteId.toString(),
    );
    if (unlockResult.advanced) {
      await flushInstituteReadCache(application.instituteId.toString());
    }
  }

  return {
    ...formatStudentApplication(application),
    ...getDocumentUploadProgress(offering, application),
    workflow: workflowSteps,
    correctionNote: application.correctionNote ?? '',
    correctionRequiredDocuments: application.correctionRequiredDocuments ?? [],
    payment: await getApplicationPaymentState(offering, application),
    visitPlanning,
  };
}

function canStudentEditDocuments(application) {
  return (
    application.status === APPLICATION_STATUS.DRAFT ||
    application.status === APPLICATION_STATUS.NEEDS_CORRECTION
  );
}

function assertRequirementEditable(offering, application, requirement) {
  if (application.status !== APPLICATION_STATUS.NEEDS_CORRECTION) return;

  const requiredNames = application.correctionRequiredDocuments ?? [];
  if (!requiredNames.length) return;

  if (!requiredNames.includes(requirement.name)) {
    throw new AppError(`Only these documents can be updated: ${requiredNames.join(', ')}`, 400);
  }
}

async function getStudentEditableApplication(instituteId, user, serviceId, offeringId) {
  const { offering } = await getVisibleServiceOffering(instituteId, serviceId, offeringId, user);
  const application = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Start your request before uploading documents', 400);
  }

  if (!canStudentEditDocuments(application)) {
    throw new AppError('Documents cannot be changed in the current request status', 400);
  }

  return { offering, application };
}

async function getVisibleServiceOffering(instituteId, serviceId, offeringId, user = null) {
  const service = await Service.findOne({
    _id: serviceId,
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
  });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  if (service.systemKey === SYSTEM_SERVICE_KEYS.ENROLLMENT) {
    const enrolledOfferingId = user?.enrolledOfferingId?.toString?.() ?? user?.enrolledOfferingId;
    if (!enrolledOfferingId || enrolledOfferingId !== offeringId) {
      throw new AppError('Service option not found', 404);
    }
  }

  const offering = await Offering.findOne({
    ...studentVisibleOfferingQuery(instituteId, service._id),
    _id: offeringId,
  });
  if (!offering || !isStudentVisibleOffering(offering)) {
    throw new AppError('Service option not found', 404);
  }

  return { service, offering };
}

/**
 * @param {string} instituteId
 * @param {{ email: string, name: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {Record<string, unknown>} [applicantDetails]
 */
export async function startStudentServiceApplication(
  instituteId,
  user,
  serviceId,
  offeringId,
  applicantDetails = {},
) {
  const { offering } = await getVisibleServiceOffering(instituteId, serviceId, offeringId, user);
  await assertStudentEligibleForUser(offering, user, instituteId);
  const email = user.email.toLowerCase();

  const { details, errors } = validateApplicantDetails(
    offering.applicantFields,
    applicantDetails ?? {},
  );
  if (errors.length) {
    throw new AppError(errors[0], 400);
  }

  const existing = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: email,
  });

  if (existing) {
    if (existing.status !== APPLICATION_STATUS.DRAFT) {
      throw new AppError('You already submitted a request for this option', 400);
    }
    existing.applicantDetails = details;
    await existing.save();
    await flushInstituteReadCache(instituteId);
    return {
      ...(await enrichStudentApplication(existing, offering)),
      offeringName: offering.name,
    };
  }

  const application = await Application.create({
    instituteId,
    serviceId,
    offeringId,
    applicantName: user.name.trim(),
    applicantEmail: email,
    applicantDetails: details,
    status: APPLICATION_STATUS.DRAFT,
    currentStepId: offering.workflowSteps?.[0]?.stepId ?? null,
  });

  await flushInstituteReadCache(instituteId);
  return {
    ...(await enrichStudentApplication(application, offering)),
    offeringName: offering.name,
  };
}

/**
 * @param {string} instituteId
 * @param {{ email: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {Record<string, unknown>} applicantDetails
 */
export async function updateStudentServiceApplicationDetails(
  instituteId,
  user,
  serviceId,
  offeringId,
  applicantDetails,
) {
  const { offering, application } = await getStudentEditableApplication(
    instituteId,
    user,
    serviceId,
    offeringId,
  );

  const { details, errors } = validateApplicantDetails(
    offering.applicantFields,
    applicantDetails ?? {},
  );
  if (errors.length) {
    throw new AppError(errors[0], 400);
  }

  application.applicantDetails = details;
  await application.save();

  await flushInstituteReadCache(instituteId);
  return await enrichStudentApplication(application, offering);
}

/**
 * @param {string} instituteId
 * @param {{ email: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {string} requirementId
 * @param {Express.Multer.File} file
 */
export async function uploadStudentApplicationDocument(
  instituteId,
  user,
  serviceId,
  offeringId,
  requirementId,
  file,
) {
  if (!file) {
    throw new AppError('Document file is required', 400);
  }

  const { offering, application } = await getStudentEditableApplication(
    instituteId,
    user,
    serviceId,
    offeringId,
  );

  const requirement = findDocumentRequirement(offering, requirementId);
  if (!requirement) {
    await removeStoredApplicationFile(file.path);
    throw new AppError('Document requirement not found', 404);
  }

  assertRequirementEditable(offering, application, requirement);

  const validationError = validateUploadedFile(requirement, file);
  if (validationError) {
    await removeStoredApplicationFile(file.path);
    throw new AppError(validationError, 400);
  }

  const existingIndex = application.documents.findIndex(
    (document) => document.requirementId.toString() === requirementId,
  );
  if (existingIndex >= 0) {
    await deleteStoredApplicationDocument(application.documents[existingIndex]);
    application.documents.splice(existingIndex, 1);
  }

  const stored = await persistUploadedApplicationFile(file);
  application.documents.push({
    requirementId: requirement._id,
    requirementName: requirement.name,
    ...stored,
  });

  await application.save();

  await flushInstituteReadCache(instituteId);
  return await enrichStudentApplication(application, offering);
}

/**
 * @param {string} instituteId
 * @param {{ email: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {string} requirementId
 */
export async function removeStudentApplicationDocument(
  instituteId,
  user,
  serviceId,
  offeringId,
  requirementId,
) {
  const { offering, application } = await getStudentEditableApplication(
    instituteId,
    user,
    serviceId,
    offeringId,
  );

  const existingIndex = application.documents.findIndex(
    (document) => document.requirementId.toString() === requirementId,
  );
  if (existingIndex < 0) {
    throw new AppError('Uploaded document not found', 404);
  }

  const requirement = findDocumentRequirement(offering, requirementId);
  if (requirement) {
    assertRequirementEditable(offering, application, requirement);
  }

  await deleteStoredApplicationDocument(application.documents[existingIndex]);
  application.documents.splice(existingIndex, 1);
  await application.save();

  await flushInstituteReadCache(instituteId);
  return await enrichStudentApplication(application, offering);
}

/**
 * @param {string} instituteId
 * @param {{ email: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 */
export async function submitStudentServiceApplication(instituteId, user, serviceId, offeringId) {
  const { service, offering } = await getVisibleServiceOffering(instituteId, serviceId, offeringId, user);

  const application = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Start your request before submitting', 400);
  }

  if (application.status !== APPLICATION_STATUS.DRAFT) {
    throw new AppError('This request has already been submitted', 400);
  }

  await assertStudentEligibleForUser(offering, user, instituteId);

  const missingRequired = getMissingRequiredDocuments(offering, application);
  if (missingRequired.length > 0) {
    throw new AppError(
      `Upload all required documents before submitting: ${missingRequired.map((item) => item.name).join(', ')}`,
      400,
    );
  }

  const applicantValidation = validateApplicantDetails(
    offering.applicantFields,
    Object.fromEntries((application.applicantDetails ?? []).map((item) => [item.fieldKey, item.value])),
  );
  if (applicantValidation.errors.length) {
    throw new AppError(applicantValidation.errors[0], 400);
  }

  await assertBeforeSubmitPaymentComplete(offering, application);

  const { configurationVersion, workflowSnapshot } = snapshotOfferingWorkflow(offering);
  application.configurationVersion = configurationVersion;
  application.workflowSnapshot = workflowSnapshot;
  application.workflowHistory = [];
  application.correctionNote = undefined;
  application.correctionRequiredDocuments = [];

  let enqueueAiVerification = false;
  if (workflowSnapshot.length > 0) {
    application.currentStepId = workflowSnapshot[0].stepId;
    application.status = APPLICATION_STATUS.IN_REVIEW;
    enqueueAiVerification = settleAiWorkflowSteps(application, {
      userId: user.userId ?? user._id?.toString?.() ?? 'system',
      name: user.name ?? 'Student',
      role: ROLES.STUDENT,
    });
  } else {
    application.status = APPLICATION_STATUS.SUBMITTED;
  }

  await refreshApplicationRuntime(application, instituteId);
  await application.save();

  if (enqueueAiVerification) {
    await enqueueApplicationAiVerification(instituteId, application._id.toString()).catch(() => {});
  }

  const institute = await Institute.findById(instituteId).select('name');
  const emailContext = {
    serviceName: service.name,
    offeringName: offering.name,
    instituteName: institute?.name ?? 'Your institute',
  };

  notifyApplicationSubmitted(application, emailContext).catch(() => {});

  if (application.status === APPLICATION_STATUS.IN_REVIEW) {
    notifyApplicationStatusChange(application, {
      serviceName: service.name,
      offeringName: offering.name,
      instituteName: emailContext.instituteName,
    }, APPLICATION_STATUS.IN_REVIEW).catch(() => {});
  }

  await flushInstituteReadCache(instituteId);
  return await enrichStudentApplication(application, offering);
}

/**
 * @param {string} instituteId
 * @param {{ email: string, name: string, userId?: string }} user
 * @param {string} serviceId
 * @param {string} offeringId
 */
export async function resubmitStudentServiceApplication(instituteId, user, serviceId, offeringId) {
  const { service, offering } = await getVisibleServiceOffering(instituteId, serviceId, offeringId, user);

  const application = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Request not found', 404);
  }

  if (application.status !== APPLICATION_STATUS.NEEDS_CORRECTION) {
    throw new AppError('This request is not waiting for corrections', 400);
  }

  const missingRequired = getMissingRequiredDocuments(offering, application);
  if (missingRequired.length > 0) {
    throw new AppError(
      `Upload all required documents before resubmitting: ${missingRequired.map((item) => item.name).join(', ')}`,
      400,
    );
  }

  application.status = APPLICATION_STATUS.IN_REVIEW;
  application.correctionNote = undefined;
  application.correctionRequiredDocuments = [];

  const enqueueAiVerification = settleAiWorkflowSteps(application, {
    userId: user.userId ?? user._id?.toString?.() ?? 'system',
    name: user.name ?? 'Student',
    role: ROLES.STUDENT,
  });

  await refreshApplicationRuntime(application, instituteId);
  await application.save();

  if (enqueueAiVerification) {
    await enqueueApplicationAiVerification(instituteId, application._id.toString()).catch(() => {});
  }

  const institute = await Institute.findById(instituteId).select('name');
  notifyApplicationStatusChange(application, {
    serviceName: service.name,
    offeringName: offering.name,
    instituteName: institute?.name ?? 'Your institute',
  }, APPLICATION_STATUS.IN_REVIEW).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return await enrichStudentApplication(application, offering);
}

/**
 * @param {string} instituteId
 * @param {string} userEmail
 * @param {string} serviceId
 * @param {string} offeringId
 * @param {string} documentId
 * @param {import('express').Response} res
 * @param {{ download?: boolean }} [options]
 */
export async function streamStudentApplicationDocument(
  instituteId,
  userEmail,
  serviceId,
  offeringId,
  documentId,
  res,
  options = {},
) {
  const application = await Application.findOne({
    instituteId,
    serviceId,
    offeringId,
    applicantEmail: userEmail.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const document = findApplicationDocument(application, documentId);
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await streamDocumentFile(document, res, options);
}
