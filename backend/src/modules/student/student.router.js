import { Router } from 'express';
import * as studentController from './student.controller.js';
import * as studentEligibilityController from './student.eligibility.controller.js';
import * as lifecycleController from '../applications/application.lifecycle.controller.js';
import paymentRouter from '../payments/payment.router.js';
import { applicationDocumentUpload } from '../../core/config/upload.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get('/institutes', studentController.listInstitutes);
router.get('/:instituteId/institute', studentController.getInstitute);
router.get('/:instituteId/enrollment/intake-status', studentController.getEnrollmentIntakeStatus);
router.get('/:instituteId/enrollment/offerings', studentController.listEnrollmentOfferings);
router.get('/:instituteId/enrollment/offerings/:offeringId', studentController.getEnrollmentOffering);
router.post(
  '/:instituteId/enrollment/applications',
  applicationDocumentUpload.single('intakeDocument'),
  studentController.createApplication,
);

router.use(requireAuth, requireRole(ROLES.STUDENT));

router.get('/applications', studentController.listApplications);
router.patch('/applications/:id/withdraw', lifecycleController.withdraw);
router.get('/offerings/:offeringId/eligibility-preview', studentEligibilityController.previewEligibility);
router.get('/services', studentController.listServices);
router.get('/services/:serviceId', studentController.getService);
router.post(
  '/services/:serviceId/offerings/:offeringId/applications/start',
  studentController.startServiceApplication,
);
router.put(
  '/services/:serviceId/offerings/:offeringId/applications/details',
  studentController.updateServiceApplicationDetails,
);
router.post(
  '/services/:serviceId/offerings/:offeringId/applications/submit',
  studentController.submitServiceApplication,
);
router.post(
  '/services/:serviceId/offerings/:offeringId/applications/resubmit',
  studentController.resubmitServiceApplication,
);
router.post(
  '/services/:serviceId/offerings/:offeringId/applications/documents/:requirementId',
  applicationDocumentUpload.single('file'),
  studentController.uploadServiceApplicationDocument,
);
router.delete(
  '/services/:serviceId/offerings/:offeringId/applications/documents/:requirementId',
  studentController.removeServiceApplicationDocument,
);
router.use(
  '/services/:serviceId/offerings/:offeringId/payments',
  paymentRouter,
);
router.get(
  '/services/:serviceId/offerings/:offeringId/applications/documents/:documentId/file',
  studentController.downloadServiceApplicationDocument,
);
router.post('/change-password', studentController.changePassword);
router.post('/skip-password-change', studentController.skipPasswordChange);

export default router;
