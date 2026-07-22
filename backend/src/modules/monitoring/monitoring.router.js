import { Router } from 'express';
import * as monitoringController from './monitoring.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get(
  '/health',
  requireAuth,
  requireRole(ROLES.ADMIN),
  monitoringController.adminHealth,
);

export default router;
