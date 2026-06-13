import { Router } from 'express';
import * as studentController from './student.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get('/institute', studentController.getInstitute);
router.get('/enrollment/offerings', studentController.listEnrollmentOfferings);
router.get('/enrollment/offerings/:offeringId', studentController.getEnrollmentOffering);
router.post('/enrollment/applications', studentController.createApplication);

router.use(requireAuth, requireRole(ROLES.STUDENT));

router.get('/services', studentController.listServices);
router.get('/services/:serviceId', studentController.getService);
router.post('/change-password', studentController.changePassword);
router.post('/skip-password-change', studentController.skipPasswordChange);

export default router;
