import { Application } from './application.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createNotification } from '../notifications/notification.service.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import {
  notifyApplicationStatusChange,
  notifyApplicationRollback,
  notifyApplicationAssigned,
} from '../../shared/templates/applicationEmails.js';
import { getWorkflowSteps, getCurrentWorkflowStep } from '../../shared/helpers/workflowExecution.helper.js';
import { loadApplicationContext } from './application.service.js';
import { purgeApplicationRecord } from './application.purge.helper.js';
import { Offering } from '../offerings/offering.model.js';
import { isWorkflowFeeStepId } from '../payments/payment.service.js';
const TERMINAL_STATUSES = new Set([
  APPLICATION_STATUS.ADMITTED,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.WITHDRAWN,
  APPLICATION_STATUS.CANCELLED,
]);

const WITHDRAWABLE_STATUSES = new Set([
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.NEEDS_CORRECTION,
]);

const CANCELLABLE_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.NEEDS_CORRECTION,
]);

const REOPENABLE_STATUSES = new Set([
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.CANCELLED,
  APPLICATION_STATUS.WITHDRAWN,
]);

async function getApplication(instituteId, applicationId) {
  const application = await Application.findOne({ _id: applicationId, instituteId });
  if (!application) {
    throw new AppError('Application not found', 404);
  }
  return application;
}

async function getApplicationForActor(instituteId, applicationId, actor) {
  if (actor.role === ROLES.STAFF) {
    const application = await Application.findOne({
      _id: applicationId,
      instituteId,
      assignedTo: actor.userId,
    });
    if (!application) {
      throw new AppError('Assigned request not found', 404);
    }
    return application;
  }
  return getApplication(instituteId, applicationId);
}

function appendLifecycleHistory(application, actor, action, note = '') {
  application.workflowHistory.push({
    stepId: application.currentStepId ?? 'lifecycle',
    stepName: 'Request lifecycle',
    outcome: action,
    actedBy: actor.userId,
    actedByName: actor.name ?? '',
    actedByRole: actor.role ?? '',
    note,
    createdAt: new Date(),
  });
}

async function emitLifecycleUpdate(application, instituteId) {
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
      assignedTo: application.assignedTo?.toString() ?? null,
      updatedAt: application.updatedAt,
    },
  });
  await flushInstituteReadCache(instituteId);
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 */
export async function getApplicationAuditLog(instituteId, applicationId, actor = null) {
  const application = actor
    ? await getApplicationForActor(instituteId, applicationId, actor)
    : await getApplication(instituteId, applicationId);
  return {
    applicationId: application._id.toString(),
    configurationVersion: application.configurationVersion ?? null,
    entries: (application.workflowHistory ?? []).map((entry) => ({
      id: entry._id?.toString(),
      stepId: entry.stepId,
      stepName: entry.stepName,
      outcome: entry.outcome,
      actedByName: entry.actedByName,
      actedByRole: entry.actedByRole,
      note: entry.note ?? '',
      createdAt: entry.createdAt,
    })),
  };
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {Object} user
 * @param {string} [note]
 */
export async function withdrawApplication(instituteId, applicationId, user, note = '') {
  const application = await getApplication(instituteId, applicationId);

  if (application.applicantEmail !== user.email.toLowerCase()) {
    throw new AppError('You can only withdraw your own requests', 403);
  }

  if (!WITHDRAWABLE_STATUSES.has(application.status)) {
    throw new AppError('This request cannot be withdrawn in its current state', 400);
  }

  application.status = APPLICATION_STATUS.WITHDRAWN;
  appendLifecycleHistory(application, user, 'withdrawn', note);
  await application.save();

  notifyApplicationStatusChange(application, null, APPLICATION_STATUS.WITHDRAWN).catch(() => {});
  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {Object} actor
 * @param {string} [note]
 */
export async function cancelApplication(instituteId, applicationId, actor, note = '') {
  const application = await getApplicationForActor(instituteId, applicationId, actor);

  if (!CANCELLABLE_STATUSES.has(application.status)) {
    throw new AppError('This request cannot be cancelled in its current state', 400);
  }

  application.status = APPLICATION_STATUS.CANCELLED;
  appendLifecycleHistory(application, actor, 'cancelled', note);
  await application.save();

  notifyApplicationStatusChange(application, null, APPLICATION_STATUS.CANCELLED).catch(() => {});
  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {Object} actor
 * @param {string} [note]
 */
export async function reopenApplication(instituteId, applicationId, actor, note = '') {
  const application = await getApplication(instituteId, applicationId);

  if (!REOPENABLE_STATUSES.has(application.status)) {
    throw new AppError('Only rejected, cancelled, or withdrawn requests can be reopened', 400);
  }

  application.status = APPLICATION_STATUS.IN_REVIEW;
  appendLifecycleHistory(application, actor, 'reopened', note);
  await application.save();

  notifyApplicationStatusChange(application, null, APPLICATION_STATUS.IN_REVIEW).catch(() => {});
  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} staffUserId
 * @param {Object} actor
 * @param {string} [note]
 */
export async function transferApplication(instituteId, applicationId, staffUserId, actor, note = '') {
  const application = await getApplication(instituteId, applicationId);

  if (TERMINAL_STATUSES.has(application.status)) {
    throw new AppError('Cannot transfer a closed request', 400);
  }

  const assignee = await User.findOne({
    _id: staffUserId,
    instituteId,
    role: { $in: [ROLES.STAFF, ROLES.ADMIN] },
    isActive: true,
  });

  if (!assignee) {
    throw new AppError('Assignee not found', 404);
  }

  application.assignedTo = assignee._id;
  application.assignedAt = new Date();
  application.assignedBy = actor.userId;
  appendLifecycleHistory(application, actor, 'transferred', note || `Transferred to ${assignee.name}`);
  await application.save();

  const context = await loadApplicationContext(application, instituteId);
  const reviewLink =
    assignee.role === ROLES.ADMIN
      ? `/admin/applications/${application._id.toString()}`
      : `/staff/applications/${application._id.toString()}`;

  notifyApplicationAssigned(application, context, assignee).catch(() => {});

  await createNotification({
    instituteId,
    userId: staffUserId,
    type: 'assignment',
    title: 'Request transferred to you',
    body: `${application.applicantName} — transferred by ${actor.name}`,
    link: reviewLink,
    metadata: { applicationId: application._id.toString() },
  });

  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {Object} actor
 * @param {string} [note]
 */
export async function escalateApplication(instituteId, applicationId, actor, note = '') {
  const application = await getApplicationForActor(instituteId, applicationId, actor);

  if (TERMINAL_STATUSES.has(application.status)) {
    throw new AppError('Cannot escalate a closed request', 400);
  }

  const admin = await User.findOne({
    instituteId,
    role: ROLES.ADMIN,
    isActive: true,
  }).sort({ createdAt: 1 });

  if (admin) {
    application.assignedTo = null;
    application.assignedAt = null;
  }

  appendLifecycleHistory(application, actor, 'escalated', note || 'Escalated for admin review');
  await application.save();

  if (admin) {
    await createNotification({
      instituteId,
      userId: admin._id.toString(),
      type: 'escalation',
      title: 'Request escalated',
      body: `${application.applicantName} — escalated by ${actor.name}`,
      link: `/admin/applications/${application._id.toString()}`,
      metadata: { applicationId: application._id.toString() },
    });
  }

  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {Object} staffUser
 */
export async function claimApplication(instituteId, applicationId, staffUser) {
  const application = await getApplication(instituteId, applicationId);

  if (application.assignedTo) {
    throw new AppError('This request is already assigned', 400);
  }

  if (TERMINAL_STATUSES.has(application.status)) {
    throw new AppError('Cannot claim a closed request', 400);
  }

  if (![APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.IN_REVIEW].includes(application.status)) {
    throw new AppError('Only active submitted or in-review requests can be claimed', 400);
  }

  application.assignedTo = staffUser.userId;
  application.assignedAt = new Date();
  appendLifecycleHistory(application, staffUser, 'claimed', 'Claimed from unassigned pool');
  await application.save();

  await createNotification({
    instituteId,
    userId: staffUser.userId,
    type: 'assignment',
    title: 'Request claimed',
    body: `${application.applicantName} — you claimed this request`,
    link: `/staff/applications/${application._id.toString()}`,
    metadata: { applicationId: application._id.toString() },
  });

  await emitLifecycleUpdate(application, instituteId);
  return application;
}

const ROLLBACK_ALLOWED_STATUSES = new Set([
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.NEEDS_CORRECTION,
  APPLICATION_STATUS.PENDING_AI_REVIEW,
]);

function canRollbackApplication(application, actor) {
  if (ROLLBACK_ALLOWED_STATUSES.has(application.status)) return true;
  return actor.role === ROLES.ADMIN && application.status === APPLICATION_STATUS.ADMITTED;
}

/**
 * Roll a student's application back to an earlier workflow step.
 * The student is notified by email and sees the reason on their dashboard.
 *
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} targetStepId — the stepId to roll back to
 * @param {Object} actor — { userId, name, role }
 * @param {string} [note] — optional reason shown to student
 * @param {string[]} [correctionRequiredDocuments]
 * @param {string} [auditNote]
 */
export async function rollbackToStep(
  instituteId,
  applicationId,
  targetStepId,
  actor,
  note = '',
  correctionRequiredDocuments = [],
  auditNote = '',
) {
  const application = await getApplicationForActor(instituteId, applicationId, actor);

  if (!canRollbackApplication(application, actor)) {
    throw new AppError('This request cannot be rolled back in its current state', 400);
  }

  const steps = getWorkflowSteps(application);
  let currentStep = getCurrentWorkflowStep(application);
  if (application.status === APPLICATION_STATUS.ADMITTED && steps.length) {
    const lastStep = steps[steps.length - 1];
    if (!currentStep || currentStep.order < lastStep.order) {
      currentStep = lastStep;
    }
  }
  const targetStep = steps.find((step) => step.stepId === targetStepId);

  if (!targetStep) {
    throw new AppError('Target step not found in workflow', 400);
  }

  if (!currentStep || targetStep.order >= currentStep.order) {
    throw new AppError('Can only roll back to an earlier step', 400);
  }

  // Record in history
  application.workflowHistory.push({
    stepId: currentStep.stepId,
    stepName: currentStep.name,
    outcome: 'rolled_back',
    actedBy: actor.userId,
    actedByName: actor.name,
    actedByRole: actor.role,
    note: auditNote?.trim() || note?.trim() || `Rolled back to step: ${targetStep.name}`,
    createdAt: new Date(),
  });

  // Fee-step rollbacks stay in review so checkout can open; other steps ask the student to fix and resubmit.
  const offering = await Offering.findById(application.offeringId).select(
    'paymentConfig workflowSteps',
  );
  const reopenPayment = isWorkflowFeeStepId(offering, application, targetStepId);
  application.currentStepId = targetStepId;
  application.status = reopenPayment
    ? APPLICATION_STATUS.IN_REVIEW
    : APPLICATION_STATUS.NEEDS_CORRECTION;
  application.correctionNote = note?.trim() || undefined;
  application.correctionRequiredDocuments = Array.isArray(correctionRequiredDocuments)
    ? correctionRequiredDocuments.filter((name) => String(name).trim())
    : [];

  // Store rollback metadata so the student sees a banner
  application.rollbackNote = note?.trim() || '';
  application.rolledBackToStepId = targetStepId;
  application.rolledBackAt = new Date();

  // Reset SLA timers for the new current step
  application.currentStepStartedAt = new Date();
  if (targetStep.slaValue && targetStep.slaUnit) {
    const ms =
      targetStep.slaUnit === 'hours'
        ? targetStep.slaValue * 3_600_000
        : targetStep.slaValue * 86_400_000;
    application.currentStepDueAt = new Date(Date.now() + ms);
  } else {
    application.currentStepDueAt = undefined;
  }
  application.slaBreached = false;

  await application.save();

  // Email the student
  notifyApplicationRollback(application, targetStep.name, note).catch(() => {});

  // Notify student in-app
  const studentUser = await User.findOne({
    instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  if (studentUser) {
    await createNotification({
      instituteId,
      userId: studentUser._id.toString(),
      type: 'rollback',
      title: 'Your request was sent back',
      body: note
        ? `Your progress was rolled back to "${targetStep.name}": ${note}`
        : `Your progress was rolled back to "${targetStep.name}". Please check your request.`,
      link: `/services/${application.serviceId.toString()}`,
      metadata: { applicationId: application._id.toString() },
    });
  }

  await emitLifecycleUpdate(application, instituteId);
  return application;
}

/**
 * @param {string} instituteId
 * @param {{ page?: number, limit?: number }} query
 */
export async function listUnassignedApplications(instituteId, query = {}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter = {
    instituteId,
    assignedTo: null,
    status: { $in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.IN_REVIEW] },
  };

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('serviceId', 'name')
      .populate('offeringId', 'name'),
    Application.countDocuments(filter),
  ]);

  return {
    applications: applications.map((app) => ({
      id: app._id.toString(),
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      status: app.status,
      serviceId: app.serviceId?._id?.toString(),
      serviceName: app.serviceId?.name ?? '',
      offeringId: app.offeringId?._id?.toString(),
      offeringName: app.offeringId?.name ?? '',
      updatedAt: app.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Permanently delete a service request. Enrollment intakes still awaiting
 * authorization must be deleted from the enrollment intakes dashboard.
 */
export async function deleteApplication(instituteId, applicationId, actor) {
  if (actor.role !== ROLES.ADMIN) {
    throw new AppError('Only an administrator can delete a service request', 403);
  }

  const application = await getApplication(instituteId, applicationId);

  if (application.status === APPLICATION_STATUS.PENDING_AUTHORIZATION) {
    throw new AppError(
      'Delete pending enrollment intakes from the Enrollment intakes dashboard.',
      400,
    );
  }

  return purgeApplicationRecord(application);
}
