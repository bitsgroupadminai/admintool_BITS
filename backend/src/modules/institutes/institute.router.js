import { Router } from 'express';
import * as instituteController from './institute.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/:id', instituteController.getInstitute);
router.patch('/:id', instituteController.updateInstitute);
router.get('/:id/setup/summary', instituteController.getSetupSummary);
router.post('/:id/setup/complete', instituteController.completeSetup);

export default router;
