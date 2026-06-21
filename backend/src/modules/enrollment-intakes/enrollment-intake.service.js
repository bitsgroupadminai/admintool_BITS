import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Application } from '../applications/application.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Institute } from '../institutes/institute.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { SYSTEM_SERVICE_KEYS } from '../../shared/constants/systemServices.js';
import { ROLES } from '../../shared/constants/roles.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { snapshotOfferingWorkflow } from '../../shared/helpers/workflowExecution.helper.js';
import {
  notifyApplicationStatusChange,
  notifyEnrollmentIntakeApproved,
} from '../../shared/templates/applicationEmails.js';
import { createNotification } from '../notifications/notification.service.js';
import {
  emitApplicationUpdated,
  emitDashboardUpdated,
} from '../../shared/helpers/realtime.helper.js';
import { findApplicationDocument } from '../../shared/helpers/applicationDocument.helper.js';
import { formatPhoneForDisplay } from '../../shared/helpers/phone.helper.js';
import { streamDocumentFile } from '../applications/application.service.js';

const SALT_ROUNDS = 10;

async function getEnrollmentService(instituteId) {
  const service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });
  if (!service) {
    throw new AppError('Enrollment service is not configured', 400);
  }
  return service;
}

async function loadIntakeContext(application) {
  const [service, offering, institute] = await Promise.all([
    Service.findById(application.serviceId).select('name systemKey'),
    Offering.findById(application.offeringId).select('name workflowSteps'),
    Institute.findById(application.instituteId).select('name'),
  ]);

  if (service?.systemKey !== SYSTEM_SERVICE_KEYS.ENROLLMENT) {
    throw new AppError('This record is not an enrollment intake', 400);
  }

  return {
    serviceName: service?.name ?? 'Enrollment',
    offeringName: offering?.name ?? 'Programme',
    instituteName: institute?.name ?? 'Your institute',
    offering,
  };
}

function formatIntake(application, context = {}) {
  return {
    id: application._id.toString(),
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: formatPhoneForDisplay(application.applicantMobile),
    applicantDetails: (application.applicantDetails ?? []).map((item) => ({
      fieldKey: item.fieldKey,
      label: item.label,
      value:
        typeof item.value === 'string' && item.value.startsWith('+')
          ? formatPhoneForDisplay(item.value)
          : item.value,
    })),
    documents: (application.documents ?? []).map((document) => ({
      id: document._id.toString(),
      requirementName: document.requirementName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
    })),
    status: application.status,
    offeringId: application.offeringId.toString(),
    offeringName: context.offeringName ?? 'Programme',
    serviceName: context.serviceName ?? 'Enrollment',
    correctionNote: application.correctionNote ?? '',
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

async function findEnrollmentIntake(instituteId, intakeId) {
  const application = await Application.findOne({
    _id: intakeId,
    instituteId,
  });

  if (!application) {
    throw new AppError('Enrollment intake not found', 404);
  }

  const context = await loadIntakeContext(application);
  return { application, context };
}

/**
 * @param {string} instituteId
 * @param {import('./enrollment-intake.validator.js').listEnrollmentIntakesQuerySchema['_output']} query
 */
export async function listEnrollmentIntakes(instituteId, query) {
  return cachedRead(cacheNs.ENROLLMENT_INTAKES_LIST, [instituteId, query], async () => {
  const service = await getEnrollmentService(instituteId);
  const filter = {
    instituteId,
    serviceId: service._id,
    status: APPLICATION_STATUS.PENDING_AUTHORIZATION,
  };

  if (query.search) {
    const search = query.search.trim();
    filter.$or = [
      { applicantName: { $regex: search, $options: 'i' } },
      { applicantEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  const [applications, total] = await Promise.all([
    Application.find(filter).sort(sort).skip(skip).limit(query.limit),
    Application.countDocuments(filter),
  ]);

  const offeringIds = [...new Set(applications.map((item) => item.offeringId.toString()))];
  const offerings = await Offering.find({ _id: { $in: offeringIds } }).select('name');
  const offeringMap = new Map(offerings.map((item) => [item._id.toString(), item]));

  const intakes = applications.map((application) =>
    formatIntake(application, {
      offeringName: offeringMap.get(application.offeringId.toString())?.name ?? 'Programme',
      serviceName: service.name,
    }),
  );

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    intakes,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
  });
}

/**
 * @param {string} instituteId
 * @param {string} intakeId
 */
export async function getEnrollmentIntake(instituteId, intakeId) {
  return cachedRead(cacheNs.ENROLLMENT_INTAKE_DETAIL, [instituteId, intakeId], async () => {
  const { application, context } = await findEnrollmentIntake(instituteId, intakeId);
  return formatIntake(application, context);
  });
}

/**
 * @param {string} instituteId
 * @param {string} intakeId
 * @param {{ id: string, name: string, role: string }} reviewer
 * @param {{ note?: string }} payload
 */
export async function approveEnrollmentIntake(instituteId, intakeId, reviewer, payload = {}) {
  const { application, context } = await findEnrollmentIntake(instituteId, intakeId);

  if (application.status !== APPLICATION_STATUS.PENDING_AUTHORIZATION) {
    throw new AppError('Only pending authorization intakes can be approved', 400);
  }

  const offering = context.offering;
  if (!offering) {
    throw new AppError('Programme offering not found', 404);
  }

  let studentUser = await User.findOne({ email: application.applicantEmail });
  let temporaryPassword;

  if (!studentUser) {
    temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    studentUser = await User.create({
      name: application.applicantName,
      email: application.applicantEmail,
      passwordHash,
      role: ROLES.STUDENT,
      instituteId,
      enrolledOfferingId: offering._id,
      enrolledProgrammeName: offering.name,
      enrollmentStatus: 'enrolled',
      mustChangePassword: true,
    });
  } else {
    if (studentUser.role !== ROLES.STUDENT) {
      throw new AppError('This email is already used by a non-student account', 409);
    }
    if (studentUser.instituteId.toString() !== instituteId) {
      throw new AppError('This email belongs to another institute', 409);
    }
    studentUser.name = application.applicantName;
    studentUser.enrolledOfferingId = offering._id;
    studentUser.enrolledProgrammeName = offering.name;
    studentUser.enrollmentStatus = 'enrolled';
    await studentUser.save();
  }

  const { configurationVersion, workflowSnapshot } = snapshotOfferingWorkflow(offering);
  application.configurationVersion = configurationVersion;
  application.workflowSnapshot = workflowSnapshot;
  application.workflowHistory = [];
  application.correctionNote = payload.note?.trim() || undefined;
  application.correctionRequiredDocuments = [];
  application.currentStepId = offering.workflowSteps?.[0]?.stepId ?? null;
  application.status = APPLICATION_STATUS.DRAFT;
  application.assignedTo = undefined;
  application.assignedAt = undefined;
  application.assignedBy = undefined;
  await application.save();

  notifyEnrollmentIntakeApproved(application, context, { temporaryPassword }).catch(() => {});

  const applicationId = application._id.toString();
  const recipients = await User.find({
    instituteId,
    role: { $in: [ROLES.ADMIN, ROLES.STAFF] },
    isActive: true,
    _id: { $ne: reviewer.id },
  }).select('_id role');

  await Promise.all(
    recipients.map((user) =>
      createNotification({
        instituteId,
        userId: user._id.toString(),
        type: 'status',
        title: 'Enrollment intake approved',
        body: `${application.applicantName} was authorized for ${context.offeringName}`,
        link:
          user.role === ROLES.STAFF
            ? `/staff/enrollment-intakes/${applicationId}`
            : `/admin/enrollment-intakes/${applicationId}`,
        metadata: { applicationId, status: application.status, source: 'enrollment_intake' },
      }),
    ),
  );

  emitApplicationUpdated({
    instituteId,
    applicationId,
    studentUserId: studentUser._id.toString(),
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

  await flushInstituteReadCache(instituteId);
  return formatIntake(application, context);
}

/**
 * @param {string} instituteId
 * @param {string} intakeId
 * @param {{ id: string, name: string, role: string }} reviewer
 * @param {{ reason: string }} payload
 */
export async function rejectEnrollmentIntake(instituteId, intakeId, reviewer, payload) {
  const { application, context } = await findEnrollmentIntake(instituteId, intakeId);

  if (application.status !== APPLICATION_STATUS.PENDING_AUTHORIZATION) {
    throw new AppError('Only pending authorization intakes can be rejected', 400);
  }

  application.status = APPLICATION_STATUS.REJECTED;
  application.correctionNote = payload.reason;
  await application.save();

  notifyApplicationStatusChange(application, context, APPLICATION_STATUS.REJECTED).catch(() => {});

  const applicationId = application._id.toString();
  const recipients = await User.find({
    instituteId,
    role: { $in: [ROLES.ADMIN, ROLES.STAFF] },
    isActive: true,
    _id: { $ne: reviewer.id },
  }).select('_id role');

  await Promise.all(
    recipients.map((user) =>
      createNotification({
        instituteId,
        userId: user._id.toString(),
        type: 'status',
        title: 'Enrollment intake rejected',
        body: `${application.applicantName} was not authorized for ${context.offeringName}`,
        link:
          user.role === ROLES.STAFF
            ? `/staff/enrollment-intakes/${applicationId}`
            : `/admin/enrollment-intakes/${applicationId}`,
        metadata: { applicationId, status: application.status, source: 'enrollment_intake' },
      }),
    ),
  );

  emitApplicationUpdated({
    instituteId,
    applicationId,
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

  await flushInstituteReadCache(instituteId);
  return formatIntake(application, context);
}

/**
 * @param {string} instituteId
 * @param {string} intakeId
 * @param {string} documentId
 * @param {import('express').Response} res
 * @param {{ download?: boolean }} [options]
 */
export async function streamIntakeDocument(instituteId, intakeId, documentId, res, options = {}) {
  const { application } = await findEnrollmentIntake(instituteId, intakeId);
  const document = findApplicationDocument(application, documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await streamDocumentFile(document, res, options);
}
