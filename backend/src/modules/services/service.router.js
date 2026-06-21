import { Router } from 'express';
import * as serviceController from './service.controller.js';
import * as knowledgeVersionController from '../knowledge-documents/knowledgeDocument.version.controller.js';
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

router.get('/', serviceController.list);
router.post('/', serviceController.create);
router.get('/:id/knowledge-coverage', knowledgeVersionController.getCoverage);
router.get('/:id/knowledge-insights', serviceController.getInsights);
router.get('/:id/rag-status', serviceController.getRagStatus);
router.post('/:id/rag-reindex', serviceController.reindexRag);
router.post('/:id/knowledge-insights/generate', serviceController.generateInsights);
router.post('/:id/knowledge-insights/suggestions', serviceController.addManualSuggestion);
router.patch(
  '/:id/knowledge-insights/suggestions/:suggestionId',
  serviceController.updateSuggestion,
);
router.post(
  '/:id/knowledge-insights/suggestions/:suggestionId/dismiss',
  serviceController.dismissSuggestion,
);
router.post(
  '/:id/knowledge-insights/suggestions/:suggestionId/create-offering',
  serviceController.createOfferingFromSuggestion,
);

router.get('/:id', serviceController.getById);
router.patch('/:id', serviceController.update);
router.post('/:id/activate', serviceController.activate);
router.delete('/:id', serviceController.remove);

export default router;
