import { Application } from '../applications/application.model.js';

import { Offering } from '../offerings/offering.model.js';

import { AppError } from '../../core/utils/AppError.js';

import { QUEUE_MODE, OFFERING_STATUS } from '../../shared/enums/offering.enums.js';

import { getDocumentUploadProgress } from '../../shared/helpers/applicationDocument.helper.js';

import {

  isVisitPlanningUnlocked,

  getVisitPlanningLockReason,

} from '../../shared/helpers/visitPlanning.helper.js';

import {

  QUEUE_TICKET_MODE,

  QUEUE_TICKET_STATUS,

  QueueTicket,

} from './queueTicket.model.js';

import { createNotification } from '../notifications/notification.service.js';

import { buildStudentServiceLink } from '../../shared/helpers/applicationLinks.helper.js';

import {

  emitQueueBoardUpdated,

  emitQueueTicketUpdated,

} from '../../shared/helpers/realtime.helper.js';

import { User } from '../users/user.model.js';

import { ROLES } from '../../shared/constants/roles.js';

import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';

import { cacheNs } from '../../shared/constants/cacheKeys.js';

import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';

import {

  estimateWaitMinutes,

  formatWaitEstimate,

  getActiveCounters,

  resolveCounterLabel,

} from '../../shared/helpers/queueWait.helper.js';

import { readOperationsCalendar } from '../institutes/institute.settings.service.js';

import { resolveDayAvailability } from '../../shared/helpers/calendarExceptions.helper.js';

import {
  computeAutoQueuePriority,
  sortQueueTicketsByPriority,
  PRIORITY_LABELS,
} from '../../shared/helpers/queuePriority.helper.js';

import { QUEUE_PRIORITY } from '../../shared/enums/operations.enums.js';

import { enqueueQueueLifecycle } from './queue.operations.service.js';



const ACTIVE_QUEUE_STATUSES = [

  QUEUE_TICKET_STATUS.WAITING,

  QUEUE_TICKET_STATUS.CALLED,

  QUEUE_TICKET_STATUS.SERVING,

];



function enrichTicket(ticket, position, offering) {

  const estimatedWaitMinutes =

    ticket.status === QUEUE_TICKET_STATUS.WAITING && position

      ? estimateWaitMinutes(position, offering?.queueConfig)

      : null;



  return {

    id: ticket._id.toString(),

    ticketNumber: ticket.ticketNumber,

    mode: ticket.mode,

    status: ticket.status,

    position,

    estimatedWaitMinutes,

    estimatedWaitLabel: estimatedWaitMinutes != null ? formatWaitEstimate(estimatedWaitMinutes) : null,

    appointmentAt: ticket.appointmentAt ?? null,

    calledAt: ticket.calledAt ?? null,

    servingAt: ticket.servingAt ?? null,

    completedAt: ticket.completedAt ?? null,

    cancelledAt: ticket.cancelledAt ?? null,

    counterId: ticket.counterId ?? null,

    counterLabel: ticket.counterLabel ?? null,

    priority: ticket.priority ?? QUEUE_PRIORITY.NORMAL,

    priorityLabel: PRIORITY_LABELS[ticket.priority ?? QUEUE_PRIORITY.NORMAL] ?? 'Normal',

    priorityReason: ticket.priorityReason ?? null,

    applicantName: ticket.applicantName,

    createdAt: ticket.createdAt,

  };

}



async function assertApplicationCanJoinQueue(application, offering) {

  const progress = getDocumentUploadProgress(offering, application);

  const applicationView = {

    status: application.status,

    documentsComplete: progress.documentsComplete,

  };



  if (!isVisitPlanningUnlocked(applicationView)) {

    throw new AppError(getVisitPlanningLockReason(applicationView), 400);

  }

}



async function assertQueueOperationsOpen(instituteId) {

  const calendar = await readOperationsCalendar(instituteId);

  const today = resolveDayAvailability(calendar, new Date());

  if (!today.open) {

    throw new AppError(

      today.reason ?? 'Walk-in queue is closed today. Please book an appointment instead.',

      400,

    );

  }

}



async function getApplicationForQueue(instituteId, applicationId, userEmail) {

  const application = await Application.findOne({

    _id: applicationId,

    instituteId,

    applicantEmail: userEmail.toLowerCase(),

  });



  if (!application) {

    throw new AppError('Application not found', 404);

  }



  const offering = await Offering.findOne({ _id: application.offeringId, instituteId });

  if (!offering) {

    throw new AppError('Offering not found', 404);

  }



  await assertApplicationCanJoinQueue(application, offering);

  return { application, offering };

}



async function getOfferingQueueConfig(instituteId, offeringId) {

  const offering = await Offering.findOne({ _id: offeringId, instituteId });

  if (!offering) {

    throw new AppError('Offering not found', 404);

  }



  if (![QUEUE_MODE.QUEUE_ONLY, QUEUE_MODE.HYBRID].includes(offering.queueMode)) {

    throw new AppError('This service option does not use a walk-in queue', 400);

  }



  return offering;

}



async function getNextTicketNumber(offeringId) {

  const latest = await QueueTicket.findOne({ offeringId }).sort({ ticketNumber: -1 }).select('ticketNumber');

  return (latest?.ticketNumber ?? 0) + 1;

}



async function getSortedWaitingTickets(offeringId) {

  const waiting = await QueueTicket.find({

    offeringId,

    status: QUEUE_TICKET_STATUS.WAITING,

  });

  return sortQueueTicketsByPriority(waiting);

}



async function getQueuePosition(offeringId, ticket) {

  if (ticket.status !== QUEUE_TICKET_STATUS.WAITING) return null;

  const sorted = await getSortedWaitingTickets(offeringId);

  const index = sorted.findIndex((item) => item._id.toString() === ticket._id.toString());

  return index >= 0 ? index + 1 : null;

}



async function broadcastWaitingPositions(offering, changedTicket = null) {

  const waiting = await getSortedWaitingTickets(offering._id);

  for (let index = 0; index < waiting.length; index += 1) {

    const waitingTicket = waiting[index];

    const position = index + 1;

    const student = await User.findOne({

      instituteId: waitingTicket.instituteId,

      email: waitingTicket.applicantEmail,

      role: ROLES.STUDENT,

    }).select('_id');



    const formatted = enrichTicket(waitingTicket, position, offering);

    if (student) {

      emitQueueTicketUpdated(student._id.toString(), formatted, waitingTicket.offeringId.toString());

    }

  }



  if (changedTicket && changedTicket.status !== QUEUE_TICKET_STATUS.WAITING) {

    const student = await User.findOne({

      instituteId: changedTicket.instituteId,

      email: changedTicket.applicantEmail,

      role: ROLES.STUDENT,

    }).select('_id');

    const formatted = enrichTicket(changedTicket, null, offering);

    if (student) {

      emitQueueTicketUpdated(student._id.toString(), formatted, changedTicket.offeringId.toString());

    }

  }

}



async function afterQueueBoardChange(instituteId, offering, changedTicket = null) {

  emitQueueBoardUpdated(instituteId, offering._id.toString());

  await broadcastWaitingPositions(offering, changedTicket);

}



async function notifyStudentQueueUpdate(ticket, position, title, body, offering) {

  const student = await User.findOne({

    instituteId: ticket.instituteId,

    email: ticket.applicantEmail,

    role: ROLES.STUDENT,

  }).select('_id');



  const formatted = enrichTicket(ticket, position, offering);

  const offeringId = ticket.offeringId.toString();



  if (student) {

    emitQueueTicketUpdated(student._id.toString(), formatted, offeringId);

    await createNotification({

      instituteId: ticket.instituteId.toString(),

      userId: student._id.toString(),

      type: 'queue',

      title,

      body,

      link: buildStudentServiceLink(ticket.serviceId.toString()),

      metadata: {

        ticketId: ticket._id.toString(),

        status: ticket.status,

        position,

        counterLabel: ticket.counterLabel,

      },

    });

  }

}



function resolveCounterForCall(offering, counterId) {

  const counters = getActiveCounters(offering.queueConfig);

  if (!counterId) {

    return counters.length === 1

      ? { counterId: counters[0].id, counterLabel: counters[0].label }

      : { counterId: null, counterLabel: null };

  }



  const match = counters.find((counter) => counter.id === counterId);

  if (!match) {

    throw new AppError('Selected service counter is not available', 400);

  }

  return { counterId: match.id, counterLabel: match.label };

}



/**

 * @param {string} instituteId

 * @param {string} applicationId

 * @param {{ email: string, name: string, userId?: string }} user

 */

export async function joinQueue(instituteId, applicationId, user) {

  const { application, offering } = await getApplicationForQueue(instituteId, applicationId, user.email);

  await getOfferingQueueConfig(instituteId, application.offeringId);

  await assertQueueOperationsOpen(instituteId);



  const existing = await QueueTicket.findOne({ applicationId: application._id });

  if (existing && ACTIVE_QUEUE_STATUSES.includes(existing.status)) {

    const position = await getQueuePosition(application.offeringId, existing);

    return enrichTicket(existing, position, offering);

  }



  const waitingCount = await QueueTicket.countDocuments({

    offeringId: application.offeringId,

    status: QUEUE_TICKET_STATUS.WAITING,

  });

  const capacity = offering.queueConfig?.capacity ?? 50;

  if (waitingCount >= capacity) {

    throw new AppError(

      'The walk-in queue is full right now. Please try again later or book an appointment.',

      409,

    );

  }



  const ticketNumber = await getNextTicketNumber(application.offeringId);

  const autoPriority = computeAutoQueuePriority(application, offering);

  const ticket = await QueueTicket.create({

    instituteId,

    serviceId: application.serviceId,

    offeringId: application.offeringId,

    applicationId: application._id,

    applicantName: application.applicantName,

    applicantEmail: application.applicantEmail,

    ticketNumber,

    mode: QUEUE_TICKET_MODE.WALK_IN,

    status: QUEUE_TICKET_STATUS.WAITING,

    priority: autoPriority.priority,

    priorityReason: autoPriority.reason,

  });



  const position = await getQueuePosition(application.offeringId, ticket);

  const waitLabel = formatWaitEstimate(estimateWaitMinutes(position, offering.queueConfig));



  if (user.userId) {

    emitQueueTicketUpdated(

      user.userId,

      enrichTicket(ticket, position, offering),

      application.offeringId.toString(),

    );

    await createNotification({

      instituteId,

      userId: user.userId,

      type: 'queue',

      title: `Queue ticket #${ticketNumber}`,

      body: `You joined the queue. Position ${position}. ${waitLabel}.`,

      link: buildStudentServiceLink(application.serviceId),

      metadata: { ticketId: ticket._id.toString(), position },

    });

  }



  await afterQueueBoardChange(instituteId, offering, ticket);

  await enqueueQueueLifecycle({

    action: 'joined',

    ticketId: ticket._id.toString(),

    instituteId,

    position,

    estimatedWaitLabel: waitLabel,

  }).catch(() => {});

  await flushInstituteReadCache(instituteId);

  return enrichTicket(ticket, position, offering);

}



/**

 * @param {string} instituteId

 * @param {string} applicationId

 * @param {string} userEmail

 */

export async function getStudentQueueStatus(instituteId, applicationId, userEmail) {

  return cachedRead(cacheNs.QUEUE_STATUS, [instituteId, applicationId, userEmail], async () => {

    const application = await Application.findOne({

      _id: applicationId,

      instituteId,

      applicantEmail: userEmail.toLowerCase(),

    });



    if (!application) {

      throw new AppError('Application not found', 404);

    }



    const offering = await Offering.findOne({ _id: application.offeringId, instituteId }).select('queueConfig');

    const ticket = await QueueTicket.findOne({ applicationId: application._id });

    if (!ticket) return null;



    const position = await getQueuePosition(application.offeringId, ticket);

    return enrichTicket(ticket, position, offering);

  });

}



/**

 * @param {string} instituteId

 * @param {string} offeringId

 */

export async function getOfferingQueueBoard(instituteId, offeringId) {

  return cachedRead(cacheNs.QUEUE_BOARD, [instituteId, offeringId], async () => {

    const offering = await getOfferingQueueConfig(instituteId, offeringId);



    const activeTickets = await QueueTicket.find({

      instituteId,

      offeringId,

      status: { $in: ACTIVE_QUEUE_STATUSES },

    });

    const waitingSorted = sortQueueTicketsByPriority(
      activeTickets.filter((ticket) => ticket.status === QUEUE_TICKET_STATUS.WAITING),
    );
    const nonWaiting = activeTickets.filter((ticket) => ticket.status !== QUEUE_TICKET_STATUS.WAITING);
    const tickets = [...waitingSorted, ...nonWaiting];

    let waitingIndex = 0;

    return tickets.map((ticket) => {

      if (ticket.status === QUEUE_TICKET_STATUS.WAITING) {

        waitingIndex += 1;

        return enrichTicket(ticket, waitingIndex, offering);

      }

      return enrichTicket(ticket, null, offering);

    });

  });

}



/**

 * @param {string} instituteId

 * @param {string} offeringId

 */

export async function getOfferingQueueStats(instituteId, offeringId) {

  const offering = await getOfferingQueueConfig(instituteId, offeringId);

  const tickets = await QueueTicket.find({

    instituteId,

    offeringId,

    status: { $in: ACTIVE_QUEUE_STATUSES },

  });



  const waiting = tickets.filter((ticket) => ticket.status === QUEUE_TICKET_STATUS.WAITING).length;

  const called = tickets.filter((ticket) => ticket.status === QUEUE_TICKET_STATUS.CALLED).length;

  const serving = tickets.filter((ticket) => ticket.status === QUEUE_TICKET_STATUS.SERVING).length;

  const capacity = offering.queueConfig?.capacity ?? 50;

  const counters = getActiveCounters(offering.queueConfig);

  const avgWaitForNewJoin = estimateWaitMinutes(waiting + 1, offering.queueConfig);



  return {

    waiting,

    called,

    serving,

    capacity,

    spotsRemaining: Math.max(0, capacity - waiting),

    avgWaitMinutes: avgWaitForNewJoin,

    avgWaitLabel: formatWaitEstimate(avgWaitForNewJoin),

    processingRatePerHour: offering.queueConfig?.processingRatePerHour ?? 10,

    counters,

  };

}



/**

 * @param {string} instituteId

 * @param {string} ticketId

 * @param {string | null | undefined} counterId

 */

export async function callNextTicket(instituteId, ticketId, counterId = null) {

  const ticket = await QueueTicket.findOne({ _id: ticketId, instituteId });

  if (!ticket) {

    throw new AppError('Queue ticket not found', 404);

  }



  if (ticket.status !== QUEUE_TICKET_STATUS.WAITING) {

    throw new AppError('Only waiting tickets can be called', 400);

  }



  const offering = await Offering.findOne({ _id: ticket.offeringId, instituteId });

  const counter = resolveCounterForCall(offering, counterId);



  ticket.status = QUEUE_TICKET_STATUS.CALLED;

  ticket.calledAt = new Date();

  ticket.counterId = counter.counterId ?? undefined;

  ticket.counterLabel = counter.counterLabel ?? undefined;

  await ticket.save();



  const counterMessage = counter.counterLabel

    ? `Please proceed to ${counter.counterLabel} now.`

    : 'Please proceed to the service counter now.';



  await notifyStudentQueueUpdate(

    ticket,

    null,

    `Queue ticket #${ticket.ticketNumber} — you're up!`,

    counterMessage,

    `Please proceed to the service counter now.`,

    offering,

  );



  await afterQueueBoardChange(instituteId, offering, ticket);

  await enqueueQueueLifecycle({

    action: 'called',

    ticketId: ticket._id.toString(),

    instituteId,

  }).catch(() => {});

  await flushInstituteReadCache(instituteId);

  return enrichTicket(ticket, null, offering);

}



/**

 * @param {string} instituteId

 * @param {string} ticketId

 */

export async function startServingTicket(instituteId, ticketId) {

  const ticket = await QueueTicket.findOne({ _id: ticketId, instituteId });

  if (!ticket) {

    throw new AppError('Queue ticket not found', 404);

  }



  if (![QUEUE_TICKET_STATUS.CALLED, QUEUE_TICKET_STATUS.WAITING].includes(ticket.status)) {

    throw new AppError('Ticket cannot be marked as serving', 400);

  }



  const offering = await Offering.findOne({ _id: ticket.offeringId, instituteId });

  ticket.status = QUEUE_TICKET_STATUS.SERVING;

  ticket.servingAt = new Date();

  if (!ticket.calledAt) ticket.calledAt = ticket.servingAt;

  await ticket.save();



  await notifyStudentQueueUpdate(

    ticket,

    null,

    `Ticket #${ticket.ticketNumber} — now being served`,

    ticket.counterLabel

      ? `You are being served at ${ticket.counterLabel}.`

      : 'You are now being served at the counter.',

    offering,

  );



  await afterQueueBoardChange(instituteId, offering, ticket);

  await flushInstituteReadCache(instituteId);

  return enrichTicket(ticket, null, offering);

}



/**

 * @param {string} instituteId

 * @param {string} ticketId

 */

export async function completeTicket(instituteId, ticketId) {

  const ticket = await QueueTicket.findOne({ _id: ticketId, instituteId });

  if (!ticket) {

    throw new AppError('Queue ticket not found', 404);

  }



  ticket.status = QUEUE_TICKET_STATUS.COMPLETED;

  ticket.completedAt = new Date();

  await ticket.save();



  const offering = await Offering.findOne({ _id: ticket.offeringId, instituteId });

  await notifyStudentQueueUpdate(

    ticket,

    null,

    `Queue ticket #${ticket.ticketNumber} completed`,

    'Your visit has been marked complete. Thank you!',

    offering,

  );



  await afterQueueBoardChange(instituteId, offering, ticket);

  await flushInstituteReadCache(instituteId);

  return enrichTicket(ticket, null, offering);

}



/**

 * @param {string} instituteId

 * @param {string} ticketId

 * @param {{ email?: string, role?: string }} actor

 */

export async function cancelTicket(instituteId, ticketId, actor = {}) {

  const ticket = await QueueTicket.findOne({ _id: ticketId, instituteId });

  if (!ticket) {

    throw new AppError('Queue ticket not found', 404);

  }



  if (!ACTIVE_QUEUE_STATUSES.includes(ticket.status)) {

    throw new AppError('This ticket is no longer active', 400);

  }



  ticket.status = QUEUE_TICKET_STATUS.CANCELLED;

  ticket.cancelledAt = new Date();

  await ticket.save();



  const offering = await Offering.findOne({ _id: ticket.offeringId, instituteId });

  const isStudent = actor.role === ROLES.STUDENT;



  await notifyStudentQueueUpdate(

    ticket,

    null,

    `Queue ticket #${ticket.ticketNumber} cancelled`,

    isStudent

      ? 'You left the queue. You can rejoin when ready.'

      : 'Your queue ticket was cancelled by staff. You can rejoin when ready.',

    offering,

  );



  await afterQueueBoardChange(instituteId, offering, ticket);

  await flushInstituteReadCache(instituteId);

  return enrichTicket(ticket, null, offering);

}



/**

 * @param {string} instituteId

 * @param {string} applicationId

 * @param {{ email: string, role?: string }} user

 */

export async function cancelStudentQueueTicket(instituteId, applicationId, user) {

  const application = await Application.findOne({

    _id: applicationId,

    instituteId,

    applicantEmail: user.email.toLowerCase(),

  });



  if (!application) {

    throw new AppError('Application not found', 404);

  }



  const ticket = await QueueTicket.findOne({ applicationId: application._id });

  if (!ticket || !ACTIVE_QUEUE_STATUSES.includes(ticket.status)) {

    throw new AppError('No active queue ticket found', 404);

  }



  return cancelTicket(instituteId, ticket._id.toString(), user);

}



/**

 * @param {string} instituteId

 * @param {string} offeringId

 * @param {string | null | undefined} counterId

 */

export async function callNextInOfferingQueue(instituteId, offeringId, counterId = null) {

  const sorted = await getSortedWaitingTickets(offeringId);

  const next = sorted[0];



  if (!next) {

    throw new AppError('No tickets waiting in queue', 404);

  }



  return callNextTicket(instituteId, next._id.toString(), counterId);

}



export async function listQueueOfferings(instituteId) {

  return cachedRead(cacheNs.QUEUE_OFFERINGS, [instituteId], async () => {

    const offerings = await Offering.find({

      instituteId,

      queueMode: { $in: [QUEUE_MODE.QUEUE_ONLY, QUEUE_MODE.HYBRID] },

      status: { $nin: [OFFERING_STATUS.DISABLED, OFFERING_STATUS.ARCHIVED, OFFERING_STATUS.EXPIRED] },

    })

      .populate('serviceId', 'name')

      .sort({ name: 1 });



    return offerings.map((offering) => ({

      id: offering._id.toString(),

      name: offering.name,

      serviceId: offering.serviceId._id.toString(),

      serviceName: offering.serviceId.name,

      queueMode: offering.queueMode,

      queueConfig: offering.queueConfig ?? null,

    }));

  });

}



/**
 * @param {string} instituteId
 * @param {string} ticketId
 * @param {{ priority: string, reason?: string, userId?: string }} payload
 */
export async function updateTicketPriority(instituteId, ticketId, payload) {
  const ticket = await QueueTicket.findOne({ _id: ticketId, instituteId });
  if (!ticket) {
    throw new AppError('Queue ticket not found', 404);
  }

  if (!Object.values(QUEUE_PRIORITY).includes(payload.priority)) {
    throw new AppError('Invalid queue priority', 400);
  }

  if (ticket.status !== QUEUE_TICKET_STATUS.WAITING) {
    throw new AppError('Only waiting tickets can have priority changed', 400);
  }

  ticket.priority = payload.priority;
  ticket.priorityReason = payload.reason?.trim() || `Set to ${PRIORITY_LABELS[payload.priority]}`;
  ticket.prioritySetBy = payload.userId ?? undefined;
  ticket.prioritySetAt = new Date();
  await ticket.save();

  const offering = await Offering.findOne({ _id: ticket.offeringId, instituteId });
  await afterQueueBoardChange(instituteId, offering, ticket);

  await enqueueQueueLifecycle({
    action: 'priority_updated',
    ticketId: ticket._id.toString(),
    instituteId,
  }).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return enrichTicket(ticket, await getQueuePosition(ticket.offeringId, ticket), offering);
}


