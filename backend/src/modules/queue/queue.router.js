import { Router } from 'express';

import * as queueController from './queue.controller.js';

import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';

import { requireRole } from '../../core/middlewares/authorize.middleware.js';

import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';

import { ROLES } from '../../shared/constants/roles.js';



const studentRouter = Router();

const staffRouter = Router();

const adminRouter = Router();



studentRouter.use(requireAuth, requireRole(ROLES.STUDENT));

studentRouter.post('/applications/:applicationId/join', queueController.joinQueue);

studentRouter.get('/applications/:applicationId/status', queueController.getStudentStatus);

studentRouter.post('/applications/:applicationId/cancel', queueController.cancelStudentQueue);



staffRouter.use(requireAuth, requireRole(ROLES.STAFF));

staffRouter.get('/offerings', queueController.listOfferings);

staffRouter.get('/offerings/:offeringId', queueController.getOfferingBoard);

staffRouter.get('/offerings/:offeringId/stats', queueController.getOfferingStats);

staffRouter.post('/tickets/:ticketId/call', queueController.callTicket);

staffRouter.post('/tickets/:ticketId/serving', queueController.startServing);

staffRouter.post('/tickets/:ticketId/complete', queueController.completeTicket);

staffRouter.patch('/tickets/:ticketId/priority', queueController.updatePriority);
staffRouter.post('/tickets/:ticketId/cancel', queueController.cancelTicket);

staffRouter.post('/offerings/:offeringId/call-next', queueController.callNext);



adminRouter.use(requireAuth, requireRole(ROLES.ADMIN), requireSetupComplete);

adminRouter.get('/offerings', queueController.listOfferings);

adminRouter.get('/offerings/:offeringId', queueController.getOfferingBoard);

adminRouter.get('/offerings/:offeringId/stats', queueController.getOfferingStats);



export { studentRouter as default, staffRouter, adminRouter };


