import { Router } from 'express';
import * as chatController from './chat.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { requireRole } from '../../core/middlewares/authorize.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole(ROLES.STUDENT));

router.get('/history', chatController.getHistory);
router.post('/messages', chatController.sendMessage);

export default router;
