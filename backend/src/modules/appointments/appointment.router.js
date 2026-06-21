import { Router } from 'express';
import * as appointmentController from './appointment.controller.js';
import * as staffAppointmentController from './appointment.staff.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const studentRouter = Router();
const staffRouter = Router();
const adminRouter = Router();

studentRouter.use(requireAuth, requireRole(ROLES.STUDENT));
studentRouter.get('/offerings/:offeringId/slots', appointmentController.listSlots);
studentRouter.post('/applications/:applicationId/book', appointmentController.book);
studentRouter.get('/applications/:applicationId/current', appointmentController.getCurrent);
studentRouter.post('/applications/:applicationId/cancel', appointmentController.cancel);
studentRouter.post('/applications/:applicationId/reschedule', staffAppointmentController.studentReschedule);

staffRouter.use(requireAuth, requireRole(ROLES.STAFF));
staffRouter.get('/offerings/:offeringId/slots', staffAppointmentController.listSlots);
staffRouter.get('/offerings', appointmentController.listOfferings);
staffRouter.get('/offerings/:offeringId', appointmentController.listOfferingAppointments);
staffRouter.patch('/:appointmentId/meeting', staffAppointmentController.updateMeeting);
staffRouter.post('/:appointmentId/generate-meeting', staffAppointmentController.generateMeeting);
staffRouter.post('/:appointmentId/send-meeting-link', staffAppointmentController.sendMeetingLink);
staffRouter.post('/:appointmentId/confirm-virtual', staffAppointmentController.confirmVirtual);
staffRouter.post('/:appointmentId/regenerate-meeting', staffAppointmentController.regenerateMeeting);
staffRouter.patch('/:appointmentId/complete', staffAppointmentController.markComplete);
staffRouter.patch('/:appointmentId/no-show', staffAppointmentController.markNoShow);
staffRouter.patch('/:appointmentId/reschedule', staffAppointmentController.reschedule);

adminRouter.use(requireAuth, requireRole(ROLES.ADMIN), requireSetupComplete);
adminRouter.get('/offerings', appointmentController.listOfferings);
adminRouter.get('/offerings/:offeringId', appointmentController.listOfferingAppointments);

export { studentRouter as default, staffRouter, adminRouter };
