import { Application } from './application.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Institute } from '../institutes/institute.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { APPLICATION_STATUS, DOCUMENT_REVIEW_STATUS } from '../../shared/enums/application.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import { notifyApplicationAssigned, notifyApplicationStatusChange } from '../../shared/templates/applicationEmails.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import {
  refreshApplicationRuntime,
  formatRuntimeFields,
  extendApplicationSla,
  escalateSlaBreach,
} from '../../shared/services/applicationRuntime.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';
import {
  findApplicationDocument,
  formatDocumentRequirements,
  getDocumentUploadProgress,
} from '../../shared/helpers/applicationDocument.helper.js';
import {
  applicationFileExists,
  openApplicationFileStream,
} from '../../shared/services/applicationFile.storage.js';
import {
  applyWorkflowOutcome,
  canUserActOnWorkflowStep,
  findStepOutcome,
  formatWorkflowForClient,
  getCurrentWorkflowStep,
  getWorkflowSteps,
} from '../../shared/helpers/workflowExecution.helper.js';
import { settleAiWorkflowSteps } from '../ai-verification/ai-step.helper.js';
import { enqueueApplicationAiVerification } from '../../core/queues/ai-verification.queue.js';
import { isAiVerificationEnabled } from '../ai-verification/ai-verification.config.js';
import { AiDecision, AI_DECISION_HANDLER } from '../ai-verification/aiDecision.model.js';
import { hydrateEligibilityDecision, hydrateDocumentVerificationDecision } from '../ai-verification/ai-verification.decision.js';
import { HANDLER_TYPE, AI_HANDLER, OUTCOME_TYPE } from '../../shared/enums/workflow.enums.js';
import { isSlaOverdue } from '../../shared/helpers/sla.helper.js';
import { logger } from '../../core/logger/index.js';

const STATUS_TRANSITIONS = {
  [APPLICATION_STATUS.SUBMITTED]: [
    APPLICATION_STATUS.IN_REVIEW,
    APPLICATION_STATUS.ADMITTED,
    APPLICATION_STATUS.REJECTED,
  ],
  [APPLICATION_STATUS.IN_REVIEW]: [APPLICATION_STATUS.ADMITTED, APPLICATION_STATUS.REJECTED],
};

const WORKFLOW_ACTION_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.PENDING_AI_REVIEW,
]);

function formatAssignee(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    staffRole: user.staffRole ?? null,
    role: user.role ?? null,
  };
}

function formatApplicationSummary(application, service, offering, assignee) {
  return {
    id: application._id.toString(),
    status: application.status,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantDetails: application.applicantDetails ?? [],
    serviceId: application.serviceId.toString(),
    serviceName: service?.name ?? 'Unknown service',
    offeringId: application.offeringId.toString(),
    offeringName: offering?.name ?? 'Unknown option',
    documentCount: application.documents?.length ?? 0,
    assignedTo: formatAssignee(assignee),
    assignedAt: application.assignedAt ?? null,
    slaBreached: Boolean(application.slaBreached),
    slaOverdue: isSlaOverdue(application.currentStepDueAt),
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function formatApplicationDocument(document) {
  return {
    id: document._id.toString(),
    requirementId: document.requirementId.toString(),
    requirementName: document.requirementName,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt,
    reviewStatus: document.reviewStatus ?? DOCUMENT_REVIEW_STATUS.PENDING,
    reviewNote: document.reviewNote ?? '',
    reviewedByName: document.reviewedByName ?? '',
    reviewedAt: document.reviewedAt ?? null,
  };
}

function formatApplicationDetail(application, service, offering, assignee, user = null) {
  const progress = offering ? getDocumentUploadProgress(offering, application) : null;
  const workflowSteps = getWorkflowSteps(application);
  const workflow =
    workflowSteps.length > 0
      ? formatWorkflowForClient(application, user ?? { role: ROLES.ADMIN })
      : null;

  return {
    id: application._id.toString(),
    status: application.status,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: application.applicantMobile ?? '',
    applicantDetails: application.applicantDetails ?? [],
    serviceId: application.serviceId.toString(),
    serviceName: service?.name ?? 'Unknown service',
    offeringId: application.offeringId.toString(),
    offeringName: offering?.name ?? 'Unknown option',
    currentStepId: application.currentStepId ?? null,
    assignedTo: formatAssignee(assignee),
    assignedAt: application.assignedAt ?? null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    documentRequirements: offering ? formatDocumentRequirements(offering.documentRequirements) : [],
    eligibilityRules: (offering?.eligibilityRules ?? []).map((rule) => ({
      field: rule.field,
      fieldType: rule.fieldType,
      operator: rule.operator,
      value: rule.value,
    })),
    documents: (application.documents ?? []).map(formatApplicationDocument),
    requiredDocumentCount: progress?.requiredDocumentCount ?? 0,
    uploadedRequiredCount: progress?.uploadedRequiredCount ?? 0,
    missingRequiredDocuments: progress?.missingRequiredDocuments ?? [],
    documentsComplete: progress?.documentsComplete ?? true,
    workflow,
    correctionNote: application.correctionNote ?? '',
    correctionRequiredDocuments: application.correctionRequiredDocuments ?? [],
    ...formatRuntimeFields(application),
  };
}

async function getInstituteApplication(instituteId, applicationId) {
  const application = await Application.findOne({ _id: applicationId, instituteId });
  if (!application) {
    throw new AppError('Application not found', 404);
  }
  return application;
}

/**
 * Latest AI verification decision per handler (excludes intake pre-screen),
 * newest first, for staff/admin review context.
 */
export async function loadApplicationAiDecisions(instituteId, applicationId) {
  const [documentDecision, eligibilityDecision, application] = await Promise.all([
    AiDecision.findOne({
      instituteId,
      applicationId,
      handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION,
    })
      .sort({ createdAt: -1 })
      .lean(),
    AiDecision.findOne({
      instituteId,
      applicationId,
      handler: AI_DECISION_HANDLER.ELIGIBILITY_SCREENING,
    })
      .sort({ createdAt: -1 })
      .lean(),
    Application.findOne({ _id: applicationId, instituteId }).select('documents offeringId').lean(),
  ]);

  const offering = application
    ? await Offering.findOne({ _id: application.offeringId, instituteId }).select(
        'eligibilityRules documentRequirements',
      )
    : null;
  const eligibilityRules = (offering?.eligibilityRules ?? []).map((rule) => ({
    field: rule.field,
    fieldType: rule.fieldType,
    operator: rule.operator,
    value: rule.value,
  }));
  const documents = [
    ...(application?.documents ?? []).map((document) => ({
      requirementName: document.requirementName,
    })),
    ...(offering?.documentRequirements ?? []).map((requirement) => ({
      requirementName: requirement.name,
    })),
  ];

  const toFormatted = (decision) => ({
    id: decision._id.toString(),
    stepId: decision.stepId ?? null,
    stepName: decision.stepName ?? '',
    handler: decision.handler,
    action: decision.action,
    verdict: decision.verdict ?? null,
    confidence: decision.confidence ?? null,
    summary: decision.summary ?? '',
    issues: Array.isArray(decision.issues) ? decision.issues : [],
    perDocument: Array.isArray(decision.perDocument) ? decision.perDocument : [],
    extractedFields: Array.isArray(decision.extractedFields) ? decision.extractedFields : [],
    eligibilityResult: decision.eligibilityResult ?? null,
    createdAt: decision.createdAt,
    raw: decision.raw ?? null,
  });

  const source = documentDecision
    ? mergeLegacyEligibilityIntoDocument(toFormatted(documentDecision), eligibilityDecision)
    : eligibilityDecision
      ? toFormatted(eligibilityDecision)
      : null;
  if (!source) return [];

  try {
    const hydrator =
      source.handler === AI_DECISION_HANDLER.DOCUMENT_VERIFICATION
        ? hydrateDocumentVerificationDecision
        : hydrateEligibilityDecision;
    const hydrated = hydrator(source, {
      eligibilityRules,
      documents,
      documentRequirements: offering?.documentRequirements ?? [],
    });
    return [
      {
        id: hydrated.id,
        stepId: hydrated.stepId,
        stepName: hydrated.stepName,
        handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION,
        action: hydrated.action,
        verdict: hydrated.verdict,
        confidence: hydrated.confidence,
        summary: hydrated.summary,
        issues: hydrated.issues,
        perDocument: hydrated.perDocument,
        extractedFields: hydrated.extractedFields,
        eligibilityResult: hydrated.eligibilityResult,
        createdAt: hydrated.createdAt,
      },
    ];
  } catch (err) {
    logger.error({ err, applicationId, decisionId: source.id }, 'Eligibility hydration failed');
    const { raw, ...rest } = source;
    return [{ ...rest, handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION }];
  }
}

function mergeLegacyEligibilityIntoDocument(documentDecision, eligibilityDecision) {
  if (!eligibilityDecision) return documentDecision;
  const hasInlineEligibility = (documentDecision.perDocument ?? []).some(
    (doc) =>
      doc.eligibilityResult ||
      (doc.subjects ?? []).length ||
      doc.aggregate != null ||
      doc.examScore != null,
  );
  if (hasInlineEligibility) return documentDecision;

  const eligibilityDocs = Array.isArray(eligibilityDecision.perDocument)
    ? eligibilityDecision.perDocument
    : [];
  const byName = new Map(
    eligibilityDocs.map((doc) => [String(doc.requirementName ?? '').trim().toLowerCase(), doc]),
  );
  return {
    ...documentDecision,
    extractedFields: documentDecision.extractedFields?.length
      ? documentDecision.extractedFields
      : eligibilityDecision.extractedFields ?? [],
    eligibilityResult: documentDecision.eligibilityResult ?? eligibilityDecision.eligibilityResult,
    perDocument: (documentDecision.perDocument ?? []).map((finding) => {
      const academic = byName.get(String(finding.requirementName ?? '').trim().toLowerCase());
      if (!academic) return finding;
      return {
        ...finding,
        qualification: finding.qualification || academic.qualification,
        aggregate: finding.aggregate ?? academic.aggregate,
        examScore: finding.examScore ?? academic.examScore,
        subjects: finding.subjects?.length ? finding.subjects : academic.subjects,
        extractedFields: [...(finding.extractedFields ?? []), ...(academic.extractedFields ?? [])],
        eligibilityResult: finding.eligibilityResult ?? academic.eligibilityResult,
      };
    }),
    raw: {
      ...(documentDecision.raw && typeof documentDecision.raw === 'object' ? documentDecision.raw : {}),
      eligibilityPerDocument: eligibilityDocs,
    },
  };
}

async function getAssignedApplication(instituteId, applicationId, staffUserId) {
  const application = await Application.findOne({
    _id: applicationId,
    instituteId,
    assignedTo: staffUserId,
  });
  if (!application) {
    throw new AppError('Assigned request not found', 404);
  }
  return application;
}

export async function loadApplicationContext(application, instituteId) {
  const [service, offering, institute] = await Promise.all([
    Service.findOne({ _id: application.serviceId, instituteId }).select('name'),
    Offering.findOne({ _id: application.offeringId, instituteId }).select(
      'name documentRequirements eligibilityRules',
    ),
    Institute.findById(instituteId).select('name'),
  ]);

  return {
    service,
    offering,
    instituteName: institute?.name ?? 'Your institute',
    serviceName: service?.name ?? 'Service',
    offeringName: offering?.name ?? 'Option',
  };
}

async function loadAssigneeMap(applications) {
  const assigneeIds = [
    ...new Set(
      applications
        .map((application) => application.assignedTo?.toString())
        .filter(Boolean),
    ),
  ];

  if (!assigneeIds.length) return new Map();

  const assignees = await User.find({ _id: { $in: assigneeIds } }).select('name email staffRole role');
  return new Map(assignees.map((user) => [user._id.toString(), user]));
}

async function loadAssignee(application) {
  if (!application.assignedTo) return null;
  return User.findById(application.assignedTo).select('name email staffRole role');
}

function buildApplicationFilter(instituteId, query, extra = {}) {
  const filter = { instituteId, ...extra };

  if (query.status === 'all') {
    // Include every status.
  } else if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = {
      $nin: [APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.PENDING_AUTHORIZATION],
    };
  }

  if (query.serviceId) {
    filter.serviceId = query.serviceId;
  }

  if (query.offeringId) {
    filter.offeringId = query.offeringId;
  }

  if (query.staffId) {
    filter.assignedTo = query.staffId;
  }

  if (query.slaBreached === 'true') {
    filter.slaBreached = true;
  } else if (query.slaBreached === 'false') {
    filter.slaBreached = { $ne: true };
  }

  if (query.search) {
    const search = query.search.trim();
    filter.$or = [
      { applicantName: { $regex: search, $options: 'i' } },
      { applicantEmail: { $regex: search, $options: 'i' } },
    ];
  }

  return filter;
}

async function paginateApplications(filter, query) {
  const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  const [applications, total] = await Promise.all([
    Application.find(filter).sort(sort).skip(skip).limit(query.limit),
    Application.countDocuments(filter),
  ]);

  const serviceIds = [...new Set(applications.map((item) => item.serviceId.toString()))];
  const offeringIds = [...new Set(applications.map((item) => item.offeringId.toString()))];

  const [services, offerings, assigneeMap] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } }).select('name'),
    Offering.find({ _id: { $in: offeringIds } }).select('name'),
    loadAssigneeMap(applications),
  ]);

  const serviceMap = new Map(services.map((item) => [item._id.toString(), item]));
  const offeringMap = new Map(offerings.map((item) => [item._id.toString(), item]));

  return {
    applications: applications.map((application) =>
      formatApplicationSummary(
        application,
        serviceMap.get(application.serviceId.toString()),
        offeringMap.get(application.offeringId.toString()),
        assigneeMap.get(application.assignedTo?.toString()),
      ),
    ),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasNextPage: query.page * query.limit < total,
      hasPrevPage: query.page > 1,
    },
  };
}

/**
 * @param {string} instituteId
 * @param {import('./application.validator.js').listApplicationsQuerySchema['_output']} query
 */
export async function listApplications(instituteId, query) {
  return cachedRead(cacheNs.APPLICATIONS_LIST, [instituteId, query], () =>
    paginateApplications(buildApplicationFilter(instituteId, query), query),
  );
}

/**
 * @param {string} instituteId
 * @param {string} staffUserId
 * @param {import('./application.validator.js').listApplicationsQuerySchema['_output']} query
 */
export async function listAssignedApplications(instituteId, staffUserId, query) {
  return cachedRead(cacheNs.APPLICATIONS_ASSIGNED, [instituteId, staffUserId, query], () =>
    paginateApplications(
      buildApplicationFilter(instituteId, query, { assignedTo: staffUserId }),
      query,
    ),
  );
}

/**
 * @param {string} instituteId
 * @param {string} staffUserId
 */
export async function getStaffAssignmentSummary(instituteId, staffUserId) {
  return cachedRead(cacheNs.STAFF_ASSIGNMENT_SUMMARY, [instituteId, staffUserId], async () => {
    const baseFilter = {
      instituteId,
      assignedTo: staffUserId,
      status: {
        $nin: [APPLICATION_STATUS.DRAFT, APPLICATION_STATUS.PENDING_AUTHORIZATION],
      },
    };

    const [total, submitted, inReview, needsCorrection, admitted, rejected] = await Promise.all([
      Application.countDocuments(baseFilter),
      Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.SUBMITTED }),
      Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.IN_REVIEW }),
      Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.NEEDS_CORRECTION }),
      Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.ADMITTED }),
      Application.countDocuments({ ...baseFilter, status: APPLICATION_STATUS.REJECTED }),
    ]);

    return { total, submitted, inReview, needsCorrection, admitted, rejected };
  });
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {{ userId: string, name: string, role: string, staffRole?: string | null }} user
 */
export async function getApplicationDetail(instituteId, applicationId, user = null) {
  return cachedRead(
    cacheNs.APPLICATION_DETAIL,
    [instituteId, applicationId, user?.userId, user?.role, 'elig-v4'],
    async () => {
      const application = await getInstituteApplication(instituteId, applicationId);
      const [context, assignee, aiDecisions] = await Promise.all([
        loadApplicationContext(application, instituteId),
        loadAssignee(application),
        loadApplicationAiDecisions(instituteId, applicationId),
      ]);

      return {
        ...formatApplicationDetail(
          application,
          context.service,
          context.offering,
          assignee,
          user,
        ),
        aiDecisions,
      };
    },
  );
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {{ userId: string, name: string, role: string, staffRole?: string | null }} user
 */
export async function getAssignedApplicationDetail(
  instituteId,
  applicationId,
  staffUserId,
  user = null,
) {
  return cachedRead(
    cacheNs.APPLICATION_ASSIGNED_DETAIL,
    [instituteId, applicationId, staffUserId, user?.userId, 'elig-v4'],
    async () => {
      const application = await getAssignedApplication(instituteId, applicationId, staffUserId);
      const [context, assignee, aiDecisions] = await Promise.all([
        loadApplicationContext(application, instituteId),
        loadAssignee(application),
        loadApplicationAiDecisions(instituteId, applicationId),
      ]);

      return {
        ...formatApplicationDetail(
          application,
          context.service,
          context.offering,
          assignee,
          user,
        ),
        aiDecisions,
      };
    },
  );
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} status
 */
export async function updateApplicationStatus(instituteId, applicationId, status, user = null) {
  const application = await getInstituteApplication(instituteId, applicationId);
  return applyStatusChange(application, instituteId, status, user);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {string} status
 * @param {{ userId: string, name: string, role: string, staffRole?: string | null } | null} user
 */
export async function updateAssignedApplicationStatus(
  instituteId,
  applicationId,
  staffUserId,
  status,
  user = null,
) {
  const application = await getAssignedApplication(instituteId, applicationId, staffUserId);
  return applyStatusChange(application, instituteId, status, user);
}

async function applyStatusChange(application, instituteId, status, user = null) {
  const allowed = STATUS_TRANSITIONS[application.status] ?? [];

  if (!allowed.includes(status)) {
    throw new AppError(`Cannot move this request from ${application.status} to ${status}`, 400);
  }

  application.status = status;
  await application.save();

  const context = await loadApplicationContext(application, instituteId);
  const assignee = await loadAssignee(application);

  notifyApplicationStatusChange(application, context, status).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return formatApplicationDetail(application, context.service, context.offering, assignee, user);
}

function mapOutcomeToLegacyStatus(outcome) {
  if (outcome === OUTCOME_TYPE.APPROVED) return APPLICATION_STATUS.ADMITTED;
  if (outcome === OUTCOME_TYPE.REJECTED) return APPLICATION_STATUS.REJECTED;
  if (outcome === OUTCOME_TYPE.NEEDS_CORRECTION) return APPLICATION_STATUS.NEEDS_CORRECTION;
  return null;
}

async function executeWorkflowAction(application, instituteId, user, payload, options = {}) {
  if (!WORKFLOW_ACTION_STATUSES.has(application.status)) {
    throw new AppError('This request is not awaiting workflow action', 400);
  }

  const step = getCurrentWorkflowStep(application);
  if (!step) {
    const legacyStatus = mapOutcomeToLegacyStatus(payload.outcome);
    if (!legacyStatus) {
      throw new AppError('Invalid workflow action', 400);
    }
    return applyStatusChange(application, instituteId, legacyStatus, user);
  }

  const outcome = findStepOutcome(step, payload.outcome);
  if (!outcome) {
    throw new AppError('This action is not available for the current step', 400);
  }

  const escalated = application.status === APPLICATION_STATUS.PENDING_AI_REVIEW;
  if (!canUserActOnWorkflowStep(user, step, { allowAiStep: escalated })) {
    throw new AppError('You are not allowed to act on the current workflow step', 403);
  }

  if (payload.outcome === OUTCOME_TYPE.NEEDS_CORRECTION && !payload.note?.trim()) {
    throw new AppError('Add a note explaining what the student should fix', 400);
  }

  const previousStatus = application.status;
  applyWorkflowOutcome(application, step, outcome, {
    userId: user.userId,
    name: user.name,
    role: user.role,
  }, payload.note, {
    correctionRequiredDocuments: payload.correctionRequiredDocuments,
  });

  let enqueueAiVerification = false;
  if (application.status === APPLICATION_STATUS.IN_REVIEW) {
    enqueueAiVerification = settleAiWorkflowSteps(application, {
      userId: user.userId,
      name: user.name,
      role: user.role,
    });
  }

  if (enqueueAiVerification) {
    application.aiVerificationPending = true;
  }

  await refreshApplicationRuntime(application, instituteId);
  await application.save();

  if (enqueueAiVerification) {
    await enqueueApplicationAiVerification(instituteId, application._id.toString()).catch(() => {});
  }

  const context = await loadApplicationContext(application, instituteId);
  const assignee = await loadAssignee(application);

  if (application.status !== previousStatus) {
    notifyApplicationStatusChange(application, context, application.status).catch(() => {});

    const studentUser = await User.findOne({
      instituteId,
      email: application.applicantEmail,
      role: ROLES.STUDENT,
    }).select('_id');

    if (studentUser) {
      createNotification({
        instituteId,
        userId: studentUser._id.toString(),
        type: 'status',
        title: 'Request status updated',
        body: `Your request is now: ${application.status.replace(/_/g, ' ')}`,
        link: `/services/${application.serviceId.toString()}`,
        metadata: { applicationId: application._id.toString(), status: application.status },
      }).catch(() => {});
    }

    emitApplicationUpdated({
      instituteId,
      applicationId: application._id.toString(),
      studentUserId: studentUser?._id?.toString() ?? null,
      assigneeUserId: assignee?.id ?? application.assignedTo?.toString() ?? null,
      summary: {
        status: application.status,
        serviceId: application.serviceId.toString(),
        offeringId: application.offeringId.toString(),
        updatedAt: application.updatedAt,
      },
    });
  }

  await flushInstituteReadCache(instituteId);
  return formatApplicationDetail(
    application,
    context.service,
    context.offering,
    assignee,
    user,
  );
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {{ userId: string, name: string, role: string, staffRole?: string | null }} user
 * @param {{ outcome: string, note?: string }} payload
 */
export async function performApplicationWorkflowAction(instituteId, applicationId, user, payload) {
  const application = await getInstituteApplication(instituteId, applicationId);
  return executeWorkflowAction(application, instituteId, user, payload);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {{ userId: string, name: string, role: string, staffRole?: string | null }} user
 * @param {{ outcome: string, note?: string }} payload
 */
export async function performAssignedApplicationWorkflowAction(
  instituteId,
  applicationId,
  staffUserId,
  user,
  payload,
) {
  const application = await getAssignedApplication(instituteId, applicationId, staffUserId);
  return executeWorkflowAction(application, instituteId, user, payload);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {string} adminUserId
 */
export async function assignApplication(
  instituteId,
  applicationId,
  staffUserId,
  adminUser,
) {
  const application = await getInstituteApplication(instituteId, applicationId);

  if (application.status === APPLICATION_STATUS.DRAFT) {
    throw new AppError('Only submitted requests can be assigned', 400);
  }

  const assignee = await User.findOne({
    _id: staffUserId,
    instituteId,
    role: { $in: [ROLES.STAFF, ROLES.ADMIN] },
    isActive: true,
  }).select('name email staffRole role');

  if (!assignee) {
    throw new AppError('Assignee not found', 404);
  }

  const isReassign = Boolean(application.assignedTo);
  application.assignedTo = assignee._id;
  application.assignedAt = new Date();
  application.assignedBy = adminUser.userId;
  await application.save();

  const context = await loadApplicationContext(application, instituteId);
  const reviewLink =
    assignee.role === ROLES.ADMIN
      ? `/admin/applications/${application._id.toString()}`
      : `/staff/applications/${application._id.toString()}`;

  notifyApplicationAssigned(application, context, assignee).catch((err) => {
    logger.error(
      { err, applicationId: application._id, assigneeId: staffUserId },
      'Failed to queue assignment email',
    );
  });

  await createNotification({
    instituteId,
    userId: staffUserId,
    type: 'assignment',
    title: isReassign ? 'Request reassigned to you' : 'New request assigned',
    body: `${application.applicantName} — ${context.offeringName ?? 'Service request'}`,
    link: reviewLink,
    metadata: { applicationId: application._id.toString() },
  });

  const studentUser = await User.findOne({
    instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  emitApplicationUpdated({
    instituteId,
    applicationId: application._id.toString(),
    studentUserId: studentUser?._id?.toString() ?? null,
    assigneeUserId: staffUserId,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      assignedTo: staffUserId,
      updatedAt: application.updatedAt,
    },
  });

  await flushInstituteReadCache(instituteId);
  return formatApplicationDetail(application, context.service, context.offering, assignee, adminUser);
}

const REVERIFY_ALLOWED_STATUSES = new Set([
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.PENDING_AI_REVIEW,
  APPLICATION_STATUS.NEEDS_CORRECTION,
]);

function findAiDocumentVerificationStep(application) {
  const steps = getWorkflowSteps(application);
  return (
    steps.find(
      (step) =>
        step.handledBy?.type === HANDLER_TYPE.AI &&
        (step.handledBy?.assignee === AI_HANDLER.DOCUMENT_VERIFICATION ||
          /document/i.test(step.name ?? '')),
    ) ?? steps.find((step) => step.handledBy?.type === HANDLER_TYPE.AI) ??
    null
  );
}

/**
 * Re-run AI verification on the full document stack from the first AI document step.
 */
export async function reverifyApplicationWithAi(instituteId, applicationId, actor) {
  if (!isAiVerificationEnabled()) {
    throw new AppError('AI verification is not enabled', 400);
  }

  const application = await getInstituteApplication(instituteId, applicationId);
  if (!REVERIFY_ALLOWED_STATUSES.has(application.status)) {
    throw new AppError('This request cannot be re-verified in its current state', 400);
  }

  if (!(application.documents ?? []).length) {
    throw new AppError('This request has no uploaded documents to verify', 400);
  }

  const targetStep = findAiDocumentVerificationStep(application);
  if (!targetStep) {
    throw new AppError('This request has no AI document verification step', 400);
  }

  application.currentStepId = targetStep.stepId;
  application.status = APPLICATION_STATUS.IN_REVIEW;
  application.correctionNote = undefined;
  application.correctionRequiredDocuments = [];
  application.aiVerificationPending = true;
  application.currentStepStartedAt = new Date();
  application.slaBreached = false;

  application.workflowHistory = application.workflowHistory ?? [];
  application.workflowHistory.push({
    stepId: targetStep.stepId,
    stepName: targetStep.name,
    outcome: 'ai_reverify_requested',
    actedBy: actor.userId,
    actedByName: actor.name ?? '',
    actedByRole: actor.role ?? '',
    note: 'Admin requested AI to re-verify all uploaded documents.',
    createdAt: new Date(),
  });

  await application.save();
  await enqueueApplicationAiVerification(instituteId, application._id.toString());
  await flushInstituteReadCache(instituteId);

  const [context, assignee, aiDecisions] = await Promise.all([
    loadApplicationContext(application, instituteId),
    loadAssignee(application),
    loadApplicationAiDecisions(instituteId, applicationId),
  ]);

  const studentUser = await User.findOne({
    instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  emitApplicationUpdated({
    instituteId,
    applicationId: application._id.toString(),
    studentUserId: studentUser?._id?.toString() ?? null,
    assigneeUserId: application.assignedTo?.toString() ?? null,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      aiVerificationPending: true,
      updatedAt: application.updatedAt,
    },
  });

  return {
    ...formatApplicationDetail(application, context.service, context.offering, assignee, actor),
    aiDecisions,
  };
}

async function finalizeSlaAction(application, instituteId, { staff, actionLabel }, user) {
  const context = await loadApplicationContext(application, instituteId);
  const assignee = staff ?? (await loadAssignee(application));

  if (staff) {
    notifyApplicationAssigned(application, context, staff).catch(() => {});

    await createNotification({
      instituteId,
      userId: staff._id.toString(),
      type: 'assignment',
      title: 'Escalated request assigned to you',
      body: `${application.applicantName} — ${context.offering?.name ?? 'Service request'} (${actionLabel})`,
      link: `/staff/applications/${application._id.toString()}`,
      metadata: { applicationId: application._id.toString(), slaAction: actionLabel },
    });
  }

  const studentUser = await User.findOne({
    instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  emitApplicationUpdated({
    instituteId,
    applicationId: application._id.toString(),
    studentUserId: studentUser?._id?.toString() ?? null,
    assigneeUserId: assignee?._id?.toString() ?? null,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      assignedTo: application.assignedTo?.toString() ?? null,
      slaBreached: false,
      updatedAt: application.updatedAt,
    },
  });

  await flushInstituteReadCache(instituteId);
  return formatApplicationDetail(application, context.service, context.offering, assignee, user);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {{ action: 'extend' | 'escalate' }} payload
 * @param {{ userId: string, role: string }} user
 */
export async function respondToSlaBreach(instituteId, applicationId, payload, user) {
  const application = await getInstituteApplication(instituteId, applicationId);

  if (payload.action === 'extend') {
    await extendApplicationSla(application, instituteId);
    return finalizeSlaAction(
      application,
      instituteId,
      { staff: null, actionLabel: 'SLA extended' },
      user,
    );
  }

  const { staff } = await escalateSlaBreach(application, instituteId);
  if (!staff) {
    throw new AppError('No available staff member to escalate this request to', 409);
  }

  return finalizeSlaAction(
    application,
    instituteId,
    { staff, actionLabel: 'SLA escalated' },
    user,
  );
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {{ action: 'extend' | 'escalate' }} payload
 * @param {{ userId: string, role: string }} user
 */
export async function respondToAssignedSlaBreach(
  instituteId,
  applicationId,
  staffUserId,
  payload,
  user,
) {
  const application = await getAssignedApplication(instituteId, applicationId, staffUserId);
  return respondToSlaBreach(instituteId, applicationId, payload, user);
}

function applyDocumentReview(application, document, user, status, note = '') {
  document.reviewStatus = status;
  document.reviewNote = note?.trim() ?? '';
  document.reviewedBy = user.userId;
  document.reviewedByName = user.name ?? '';
  document.reviewedAt = new Date();

  application.workflowHistory = application.workflowHistory ?? [];
  application.workflowHistory.push({
    stepId: application.currentStepId ?? 'document_review',
    stepName: document.requirementName || 'Document review',
    outcome:
      status === DOCUMENT_REVIEW_STATUS.APPROVED
        ? 'document_approved'
        : status === DOCUMENT_REVIEW_STATUS.REJECTED
          ? 'document_rejected'
          : 'document_needs_correction',
    actedBy: user.userId,
    actedByName: user.name ?? '',
    actedByRole: user.role ?? '',
    note: document.reviewNote,
    createdAt: new Date(),
  });
}

/**
 * Staff/admin review of a single uploaded document.
 */
export async function reviewApplicationDocument(
  instituteId,
  applicationId,
  documentId,
  user,
  payload,
  staffUserId = null,
) {
  const application = staffUserId
    ? await getAssignedApplication(instituteId, applicationId, staffUserId)
    : await getInstituteApplication(instituteId, applicationId);

  const document = findApplicationDocument(application, documentId);
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const note = payload.note?.trim() ?? '';
  if (payload.status === DOCUMENT_REVIEW_STATUS.NEEDS_CORRECTION && !note) {
    throw new AppError('Add a note explaining what the student should fix', 400);
  }

  applyDocumentReview(application, document, user, payload.status, note);

  if (payload.status === DOCUMENT_REVIEW_STATUS.NEEDS_CORRECTION) {
    const step = getCurrentWorkflowStep(application);
    const outcome = step ? findStepOutcome(step, OUTCOME_TYPE.NEEDS_CORRECTION) : null;
    const canAct =
      WORKFLOW_ACTION_STATUSES.has(application.status) &&
      outcome &&
      canUserActOnWorkflowStep(user, step, {
        allowAiStep: application.status === APPLICATION_STATUS.PENDING_AI_REVIEW,
      });

    if (canAct) {
      return executeWorkflowAction(application, instituteId, user, {
        outcome: OUTCOME_TYPE.NEEDS_CORRECTION,
        note,
        correctionRequiredDocuments: [document.requirementName],
      });
    }

    application.status = APPLICATION_STATUS.NEEDS_CORRECTION;
    application.correctionNote = note;
    application.correctionRequiredDocuments = [document.requirementName];
  }

  await application.save();
  await flushInstituteReadCache(instituteId);

  const context = await loadApplicationContext(application, instituteId);
  const assignee = await loadAssignee(application);

  if (payload.status === DOCUMENT_REVIEW_STATUS.NEEDS_CORRECTION) {
    notifyApplicationStatusChange(application, context, APPLICATION_STATUS.NEEDS_CORRECTION).catch(
      () => {},
    );
  }

  return formatApplicationDetail(application, context.service, context.offering, assignee, user);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} documentId
 * @param {import('express').Response} res
 * @param {{ download?: boolean }} [options]
 */
export async function streamAdminApplicationDocument(
  instituteId,
  applicationId,
  documentId,
  res,
  options = {},
) {
  const application = await getInstituteApplication(instituteId, applicationId);
  const document = findApplicationDocument(application, documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await streamDocumentFile(document, res, options);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {string} documentId
 * @param {import('express').Response} res
 * @param {{ download?: boolean }} [options]
 */
export async function streamAssignedApplicationDocument(
  instituteId,
  applicationId,
  staffUserId,
  documentId,
  res,
  options = {},
) {
  const application = await getAssignedApplication(instituteId, applicationId, staffUserId);
  const document = findApplicationDocument(application, documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await streamDocumentFile(document, res, options);
}

export async function streamDocumentFile(document, res, options = {}) {
  const exists = await applicationFileExists(document);
  if (!exists) {
    throw new AppError(
      'The uploaded file is no longer on the server. Ask the applicant to upload it again.',
      404,
    );
  }

  const stream = openApplicationFileStream(document);
  if (!stream) {
    throw new AppError(
      'The uploaded file is no longer on the server. Ask the applicant to upload it again.',
      404,
    );
  }

  const disposition = options.download ? 'attachment' : 'inline';
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(document.originalName || 'document')}"`,
  );

  await new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      if (!res.headersSent) {
        reject(
          new AppError(
            'The uploaded file is no longer on the server. Ask the applicant to upload it again.',
            404,
          ),
        );
        return;
      }
      reject(err);
    });
    res.on('finish', resolve);
    res.on('close', resolve);
    stream.pipe(res);
  });
}
