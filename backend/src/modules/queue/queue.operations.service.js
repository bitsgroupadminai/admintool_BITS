import { Institute } from '../institutes/institute.model.js';
import { Offering } from '../offerings/offering.model.js';
import { QueueTicket } from './queueTicket.model.js';
import {
  sendQueueJoinedEmail,
  sendQueueCalledEmail,
  sendQueuePriorityEmail,
  getStudentPortalUrl,
} from '../../shared/templates/operationsEmails.js';
import { buildStudentServiceLink } from '../../shared/helpers/applicationLinks.helper.js';
import { PRIORITY_LABELS } from '../../shared/helpers/queuePriority.helper.js';
import { enqueueOperationsJob, OPERATIONS_JOB } from '../../core/queues/operations.queue.js';

/**
 * @param {{ action: string, ticketId: string, instituteId: string }} payload
 */
export async function enqueueQueueLifecycle(payload) {
  return enqueueOperationsJob(OPERATIONS_JOB.QUEUE_LIFECYCLE, {
    ...payload,
    jobId: `${payload.action}-${payload.ticketId}-${Date.now()}`,
  });
}

/**
 * @param {{ action: string, ticketId: string, instituteId: string }} data
 */
export async function processQueueLifecycleJob(data) {
  const ticket = await QueueTicket.findOne({
    _id: data.ticketId,
    instituteId: data.instituteId,
  });
  if (!ticket) return;

  const [institute, offering] = await Promise.all([
    Institute.findById(data.instituteId).select('name'),
    Offering.findOne({ _id: ticket.offeringId, instituteId: data.instituteId }).select(
      'name serviceId',
    ),
  ]);

  const instituteName = institute?.name ?? 'Your institute';
  const serviceLink = `${getStudentPortalUrl()}${buildStudentServiceLink(ticket.serviceId.toString())}`;
  const base = {
    applicantName: ticket.applicantName,
    applicantEmail: ticket.applicantEmail,
    instituteName,
    ticketNumber: ticket.ticketNumber,
    studentPortalUrl: getStudentPortalUrl(),
    serviceLink,
  };

  if (data.action === 'joined') {
    await sendQueueJoinedEmail({
      ...base,
      position: data.position ?? 1,
      estimatedWaitLabel: data.estimatedWaitLabel,
      priority: ticket.priority,
      priorityReason: ticket.priorityReason,
    });
    return;
  }

  if (data.action === 'called') {
    await sendQueueCalledEmail({
      ...base,
      counterLabel: ticket.counterLabel,
      priority: ticket.priority,
    });
    return;
  }

  if (data.action === 'priority_updated') {
    await sendQueuePriorityEmail({
      ...base,
      priority: ticket.priority,
      priorityReason: ticket.priorityReason ?? `Updated to ${PRIORITY_LABELS[ticket.priority] ?? ticket.priority}`,
    });
  }
}
