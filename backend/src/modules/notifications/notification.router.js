import { Router } from 'express';

import * as notificationController from './notification.controller.js';

import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';

import { requireRole } from '../../core/middlewares/authorize.middleware.js';

import { ROLES } from '../../shared/constants/roles.js';



const router = Router();



router.use(requireAuth);



router.get('/', notificationController.list);

router.patch('/read-all', notificationController.markAllRead);

router.patch('/:id/read', notificationController.markRead);



router.post('/broadcast', requireRole(ROLES.ADMIN), notificationController.broadcast);

router.get('/broadcasts', requireRole(ROLES.ADMIN), notificationController.listBroadcasts);



export default router;


