import { Application } from './application.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createNotification } from '../notifications/notification.service.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { notifyApplicationStatusChange } from '../../shared/templates/applicationEmails.js';

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

  notifyApplicationStatusChange(application, 'withdrawn').catch(() => {});
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

  notifyApplicationStatusChange(application, 'cancelled').catch(() => {});
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

  notifyApplicationStatusChange(application, 'reopened').catch(() => {});
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

  const staff = await User.findOne({
    _id: staffUserId,
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  });

  if (!staff) {
    throw new AppError('Staff member not found', 404);
  }

  application.assignedTo = staff._id;
  application.assignedAt = new Date();
  application.assignedBy = actor.userId;
  appendLifecycleHistory(application, actor, 'transferred', note || `Transferred to ${staff.name}`);
  await application.save();

  await createNotification({
    instituteId,
    userId: staffUserId,
    type: 'assignment',
    title: 'Request transferred to you',
    body: `${application.applicantName} — transferred by ${actor.name}`,
    link: `/staff/applications/${application._id.toString()}`,
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
