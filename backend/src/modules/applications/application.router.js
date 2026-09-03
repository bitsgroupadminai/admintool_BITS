import { Router } from 'express';
import * as applicationController from './application.controller.js';
import * as lifecycleController from './application.lifecycle.controller.js';
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

adminRouter.get('/', applicationController.list);
adminRouter.get('/:id/audit-log', lifecycleController.getAuditLog);
adminRouter.patch('/:id/cancel', lifecycleController.cancel);
adminRouter.patch('/:id/reopen', lifecycleController.reopen);
adminRouter.patch('/:id/transfer', lifecycleController.transfer);
adminRouter.patch('/:id/escalate', lifecycleController.escalate);
adminRouter.patch('/:id/rollback', lifecycleController.rollback);
adminRouter.get('/:id', applicationController.getById);
adminRouter.patch('/:id/workflow-action', applicationController.workflowAction);
adminRouter.patch('/:id/status', applicationController.updateStatus);
adminRouter.patch('/:id/assign', applicationController.assign);
adminRouter.patch('/:id/sla-action', applicationController.slaAction);
adminRouter.get('/:id/documents/:documentId/file', applicationController.streamDocument);

staffRouter.use(
  requireAuth,
  requireRole(ROLES.STAFF),
  authorize(PERMISSIONS.ACT_ON_ASSIGNED_REQUESTS),
);

staffRouter.get('/unassigned', lifecycleController.listUnassigned);
staffRouter.get('/summary', applicationController.getAssignedSummary);
staffRouter.get('/', applicationController.listAssigned);
staffRouter.patch('/:id/claim', lifecycleController.claim);
staffRouter.patch('/:id/cancel', lifecycleController.cancel);
staffRouter.patch('/:id/escalate', lifecycleController.escalate);
staffRouter.patch('/:id/rollback', lifecycleController.rollback);
staffRouter.get('/:id/audit-log', lifecycleController.getAuditLog);
staffRouter.get('/:id', applicationController.getAssignedById);
staffRouter.patch('/:id/workflow-action', applicationController.assignedWorkflowAction);
staffRouter.patch('/:id/status', applicationController.updateAssignedStatus);
staffRouter.patch('/:id/sla-action', applicationController.assignedSlaAction);
staffRouter.get('/:id/documents/:documentId/file', applicationController.streamAssignedDocument);

export { adminRouter as default, staffRouter };
