import { Router } from 'express';
import * as enrollmentIntakeController from './enrollment-intake.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { authorize } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ROLES } from '../../shared/constants/roles.js';

const adminRouter = Router();
const staffRouter = Router();

adminRouter.use(
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  authorize(PERMISSIONS.VIEW_ALL_REQUESTS),
);

adminRouter.get('/', enrollmentIntakeController.list);
adminRouter.get('/:id', enrollmentIntakeController.getById);
adminRouter.get('/:id/documents/:documentId/file', enrollmentIntakeController.streamDocument);
adminRouter.post('/:id/approve', enrollmentIntakeController.approve);
adminRouter.post('/:id/reject', enrollmentIntakeController.reject);

staffRouter.use(requireAuth, requireRole(ROLES.STAFF));

staffRouter.get('/', enrollmentIntakeController.list);
staffRouter.get('/:id', enrollmentIntakeController.getById);
staffRouter.get('/:id/documents/:documentId/file', enrollmentIntakeController.streamDocument);

export { adminRouter as default, staffRouter };
