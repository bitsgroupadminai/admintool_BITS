import { Router } from 'express';
import * as instituteController from './institute.controller.js';
import * as instituteSettingsController from './institute.settings.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/:id', instituteController.getInstitute);
router.patch('/:id', instituteController.updateInstitute);
router.get('/:id/setup/summary', instituteController.getSetupSummary);
router.post('/:id/setup/complete', instituteController.completeSetup);
router.post('/:id/student-portal-host', instituteController.designateStudentPortalHost);
router.get('/:id/auto-assignment', instituteSettingsController.getAutoAssignment);
router.patch('/:id/auto-assignment', instituteSettingsController.updateAutoAssignment);
router.get('/:id/ai-verification', instituteSettingsController.getAiVerification);
router.patch('/:id/ai-verification', instituteSettingsController.updateAiVerification);
router.get('/:id/operations-calendar', instituteSettingsController.getOperationsCalendar);
router.patch('/:id/operations-calendar', instituteSettingsController.updateOperationsCalendar);

export default router;
