import { Router } from 'express';
import * as paymentAdminController from './payment.admin.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { authorize } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ROLES } from '../../shared/constants/roles.js';

const adminRouter = Router();

adminRouter.use(
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  authorize(PERMISSIONS.VIEW_ALL_REQUESTS),
);

adminRouter.get('/overview', paymentAdminController.getOverview);
adminRouter.get('/', paymentAdminController.list);
adminRouter.get('/:id', paymentAdminController.getById);
adminRouter.delete('/:id', paymentAdminController.remove);

export default adminRouter;
