import * as queueService from './queue.service.js';

import { sendSuccess } from '../../core/utils/apiResponse.js';

import { z } from 'zod';



const counterBodySchema = z.object({

  counterId: z.string().min(1).max(40).optional(),

});

const priorityBodySchema = z.object({
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  reason: z.string().max(300).optional(),
});



export async function joinQueue(req, res, next) {

  try {

    const ticket = await queueService.joinQueue(

      req.user.instituteId,

      req.params.applicationId,

      req.user,

    );

    sendSuccess(res, 200, 'Joined queue', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function getStudentStatus(req, res, next) {

  try {

    const ticket = await queueService.getStudentQueueStatus(

      req.user.instituteId,

      req.params.applicationId,

      req.user.email,

    );

    sendSuccess(res, 200, 'Queue status', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function cancelStudentQueue(req, res, next) {

  try {

    const ticket = await queueService.cancelStudentQueueTicket(

      req.user.instituteId,

      req.params.applicationId,

      req.user,

    );

    sendSuccess(res, 200, 'Left queue', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function getOfferingBoard(req, res, next) {

  try {

    const tickets = await queueService.getOfferingQueueBoard(

      req.user.instituteId,

      req.params.offeringId,

    );

    sendSuccess(res, 200, 'Queue board', { tickets });

  } catch (err) {

    next(err);

  }

}



export async function getOfferingStats(req, res, next) {

  try {

    const stats = await queueService.getOfferingQueueStats(

      req.user.instituteId,

      req.params.offeringId,

    );

    sendSuccess(res, 200, 'Queue stats', { stats });

  } catch (err) {

    next(err);

  }

}



export async function callTicket(req, res, next) {

  try {

    const body = counterBodySchema.parse(req.body ?? {});

    const ticket = await queueService.callNextTicket(

      req.user.instituteId,

      req.params.ticketId,

      body.counterId,

    );

    sendSuccess(res, 200, 'Ticket called', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function startServing(req, res, next) {

  try {

    const ticket = await queueService.startServingTicket(

      req.user.instituteId,

      req.params.ticketId,

    );

    sendSuccess(res, 200, 'Now serving', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function completeTicket(req, res, next) {

  try {

    const ticket = await queueService.completeTicket(req.user.instituteId, req.params.ticketId);

    sendSuccess(res, 200, 'Ticket completed', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function cancelTicket(req, res, next) {

  try {

    const ticket = await queueService.cancelTicket(

      req.user.instituteId,

      req.params.ticketId,

      req.user,

    );

    sendSuccess(res, 200, 'Ticket cancelled', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function callNext(req, res, next) {

  try {

    const body = counterBodySchema.parse(req.body ?? {});

    const ticket = await queueService.callNextInOfferingQueue(

      req.user.instituteId,

      req.params.offeringId,

      body.counterId,

    );

    sendSuccess(res, 200, 'Next ticket called', { ticket });

  } catch (err) {

    next(err);

  }

}



export async function updatePriority(req, res, next) {
  try {
    const body = priorityBodySchema.parse(req.body);
    const ticket = await queueService.updateTicketPriority(
      req.user.instituteId,
      req.params.ticketId,
      { ...body, userId: req.user.userId },
    );
    sendSuccess(res, 200, 'Priority updated', { ticket });
  } catch (err) {
    next(err);
  }
}

export async function listOfferings(req, res, next) {

  try {

    const offerings = await queueService.listQueueOfferings(req.user.instituteId);

    sendSuccess(res, 200, 'Queue services', { offerings });

  } catch (err) {

    next(err);

  }

}


