import { Router } from 'express';
import * as knowledgeController from './knowledgeDocument.controller.js';
import { knowledgeUpload } from '../../core/config/upload.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { authorize } from '../../core/middlewares/authorize.middleware.js';
import { requireSetupComplete } from '../../core/middlewares/requireSetupComplete.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router({ mergeParams: true });

router.use(
  requireAuth,
  requireRole(ROLES.ADMIN),
  requireSetupComplete,
  authorize(PERMISSIONS.MANAGE_SERVICES),
);

router.get('/', knowledgeController.list);
router.post('/', knowledgeUpload.single('file'), knowledgeController.upload);
router.delete('/:id', knowledgeController.remove);

export default router;
