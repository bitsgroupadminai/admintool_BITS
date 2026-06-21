import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get(
  '/dashboard',
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  analyticsController.adminDashboard,
);

router.get(
  '/dashboard/export',
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  analyticsController.exportAdminDashboard,
);

router.get(
  '/staff/dashboard',
  requireAuth,
  requireRole(ROLES.STAFF),
  analyticsController.staffDashboard,
);

router.get(
  '/staff/dashboard/export',
  requireAuth,
  requireRole(ROLES.STAFF),
  analyticsController.exportStaffDashboard,
);

export default router;
