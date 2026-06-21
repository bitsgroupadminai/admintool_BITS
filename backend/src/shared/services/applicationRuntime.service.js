import { Application } from '../../modules/applications/application.model.js';
import { User } from '../../modules/users/user.model.js';
import { calculateSlaDueAt, isSlaOverdue } from '../helpers/sla.helper.js';
import {
  autoAssignApplicationToStaff,
  reassignApplicationToStaff,
} from '../helpers/autoAssignment.helper.js';
import { getCurrentWorkflowStep } from '../helpers/workflowExecution.helper.js';
import { APPLICATION_STATUS } from '../enums/application.enums.js';
import { ROLES } from '../constants/roles.js';
import { scheduleSlaMonitorJob, cancelSlaMonitorJob } from '../../core/queues/sla.queue.js';
import { createNotification } from '../../modules/notifications/notification.service.js';
import { notifyApplicationAssigned } from '../templates/applicationEmails.js';
import { emitApplicationUpdated, emitDashboardUpdated } from '../helpers/realtime.helper.js';
import { AppError } from '../../core/utils/AppError.js';
import { flushInstituteReadCache } from '../helpers/cacheInvalidation.helper.js';
import { Service } from '../../modules/services/service.model.js';
import { Offering } from '../../modules/offerings/offering.model.js';
import { Institute } from '../../modules/institutes/institute.model.js';

const ACTIVE_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
]);

async function loadEmailContext(application, instituteId) {
  const [service, offering, institute] = await Promise.all([
    Service.findOne({ _id: application.serviceId, instituteId }).select('name'),
    Offering.findOne({ _id: application.offeringId, instituteId }).select('name'),
    Institute.findById(instituteId).select('name'),
  ]);

  return {
    serviceName: service?.name ?? 'Service',
    offeringName: offering?.name ?? 'Option',
    instituteName: institute?.name ?? 'Your institute',
  };
}

/**
 * Sync SLA timers and auto-assignment whenever the workflow step changes.
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {string} instituteId
 */
export async function refreshApplicationRuntime(application, instituteId) {
  const step = getCurrentWorkflowStep(application);

  if (!step || !ACTIVE_STATUSES.has(application.status)) {
    if (application.currentStepId) {
      await cancelSlaMonitorJob(application._id.toString(), application.currentStepId);
    }
    application.currentStepStartedAt = undefined;
    application.currentStepDueAt = undefined;
    application.slaBreached = false;
    return { staff: null };
  }

  if (application.currentStepId && application.currentStepId !== step.stepId) {
    await cancelSlaMonitorJob(application._id.toString(), application.currentStepId);
  }

  const startedAt = new Date();
  application.currentStepStartedAt = startedAt;
  application.currentStepDueAt = calculateSlaDueAt(step, startedAt);
  application.slaBreached = false;

  await scheduleSlaMonitorJob(
    {
      applicationId: application._id.toString(),
      instituteId,
      stepId: step.stepId,
    },
    application.currentStepDueAt,
  );

  const staff = await autoAssignApplicationToStaff(application, step, instituteId);
  if (staff) {
    const context = await loadEmailContext(application, instituteId);
    notifyApplicationAssigned(application, context, staff).catch(() => {});

    await createNotification({
      instituteId,
      userId: staff._id.toString(),
      type: 'assignment',
      title: 'New request assigned to you',
      body: `${application.applicantName} — ${context.serviceName} / ${context.offeringName}`,
      link: `/staff/applications/${application._id.toString()}`,
      metadata: { applicationId: application._id.toString() },
    });

    emitApplicationUpdated({
      instituteId,
      applicationId: application._id.toString(),
      studentUserId: null,
      assigneeUserId: staff._id.toString(),
      summary: {
        status: application.status,
        serviceId: application.serviceId.toString(),
        offeringId: application.offeringId.toString(),
        assignedTo: staff._id.toString(),
        updatedAt: application.updatedAt,
      },
    });
  }

  return { staff };
}

/**
 * @param {{ applicationId: string, instituteId: string, stepId: string }} payload
 */
export async function handleSlaBreach(payload) {
  const application = await Application.findOne({
    _id: payload.applicationId,
    instituteId: payload.instituteId,
  });

  if (!application) return;
  if (application.currentStepId !== payload.stepId) return;
  if (!ACTIVE_STATUSES.has(application.status)) return;
  if (application.slaBreached) return;
  if (!isSlaOverdue(application.currentStepDueAt)) return;

  application.slaBreached = true;
  await application.save();

  const step = getCurrentWorkflowStep(application);
  const context = await loadEmailContext(application, payload.instituteId);

  const recipients = [];
  if (application.assignedTo) {
    recipients.push(application.assignedTo.toString());
  }

  const admins = await User.find({
    instituteId: payload.instituteId,
    role: ROLES.ADMIN,
    isActive: true,
  }).select('_id');

  admins.forEach((admin) => recipients.push(admin._id.toString()));

  const uniqueRecipients = [...new Set(recipients)];
  await Promise.all(
    uniqueRecipients.map((userId) =>
      createNotification({
        instituteId: payload.instituteId,
        userId,
        type: 'sla_breach',
        title: 'SLA breach on request',
        body: `${application.applicantName} — step "${step?.name ?? 'Review'}" is overdue`,
        link: application.assignedTo
          ? `/staff/applications/${application._id.toString()}`
          : `/admin/applications/${application._id.toString()}`,
        metadata: {
          applicationId: application._id.toString(),
          stepId: payload.stepId,
        },
      }),
    ),
  );

  const studentUser = await User.findOne({
    instituteId: payload.instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  emitApplicationUpdated({
    instituteId: payload.instituteId,
    applicationId: application._id.toString(),
    studentUserId: studentUser?._id?.toString() ?? null,
    assigneeUserId: application.assignedTo?.toString() ?? null,
    summary: {
      status: application.status,
      serviceId: application.serviceId.toString(),
      offeringId: application.offeringId.toString(),
      assignedTo: application.assignedTo?.toString() ?? null,
      slaBreached: true,
      updatedAt: application.updatedAt,
    },
  });

  emitDashboardUpdated(payload.instituteId);
  await flushInstituteReadCache(payload.instituteId);
}

async function resetSlaTimer(application, instituteId) {
  const step = getCurrentWorkflowStep(application);
  if (!step) {
    throw new AppError('No active workflow step for this request', 400);
  }

  if (application.currentStepId) {
    await cancelSlaMonitorJob(application._id.toString(), application.currentStepId);
  }

  const startedAt = new Date();
  application.currentStepStartedAt = startedAt;
  application.currentStepDueAt = calculateSlaDueAt(step, startedAt);
  application.slaBreached = false;

  await scheduleSlaMonitorJob(
    {
      applicationId: application._id.toString(),
      instituteId,
      stepId: step.stepId,
    },
    application.currentStepDueAt,
  );

  return step;
}

function assertSlaActionAllowed(application) {
  if (!ACTIVE_STATUSES.has(application.status)) {
    throw new AppError('SLA actions are only available for active requests', 400);
  }

  if (!application.slaBreached && !isSlaOverdue(application.currentStepDueAt)) {
    throw new AppError('This request is not in SLA breach', 400);
  }
}

/**
 * Extend the SLA deadline for a breached request and clear the breach flag.
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {string} instituteId
 */
export async function extendApplicationSla(application, instituteId) {
  assertSlaActionAllowed(application);
  await resetSlaTimer(application, instituteId);
  await application.save();
  return { step: getCurrentWorkflowStep(application), staff: null };
}

/**
 * Escalate a breached request by reassigning it and resetting the SLA timer.
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {string} instituteId
 */
export async function escalateSlaBreach(application, instituteId) {
  assertSlaActionAllowed(application);

  const previousAssigneeId = application.assignedTo?.toString() ?? null;
  const step = await resetSlaTimer(application, instituteId);
  const staff = await reassignApplicationToStaff(
    application,
    step,
    instituteId,
    previousAssigneeId,
  );

  await application.save();
  return { step, staff, previousAssigneeId };
}

export function formatRuntimeFields(application) {
  return {
    currentStepStartedAt: application.currentStepStartedAt ?? null,
    currentStepDueAt: application.currentStepDueAt ?? null,
    slaBreached: Boolean(application.slaBreached),
    autoAssignedAt: application.autoAssignedAt ?? null,
    slaOverdue: isSlaOverdue(application.currentStepDueAt),
  };
}
