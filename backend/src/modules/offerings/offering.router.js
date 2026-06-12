import { Router } from 'express';
import * as offeringController from './offering.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { authorize } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.use(
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  authorize(PERMISSIONS.MANAGE_SERVICES),
);

router.get('/', offeringController.list);
router.post('/', offeringController.create);
router.post('/bulk', offeringController.bulkAction);
router.get('/:id', offeringController.getById);
router.patch('/:id', offeringController.update);
router.delete('/:id', offeringController.remove);
router.post('/:id/duplicate', offeringController.duplicate);
router.post('/:id/activate', offeringController.activate);

router.put('/:id/eligibility', offeringController.updateEligibility);
router.put('/:id/documents', offeringController.updateDocuments);
router.put('/:id/workflow', offeringController.updateWorkflow);
router.put('/:id/queue', offeringController.updateQueue);

router.post('/:id/ai-suggestions/generate', offeringController.generateAiSuggestions);
router.get('/:id/ai-suggestions', offeringController.getAiSuggestions);
router.post('/:id/ai-suggestions/apply', offeringController.applyAiSuggestions);
router.post('/:id/ai-suggestions/reject', offeringController.rejectAiSuggestions);

export default router;
