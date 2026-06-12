import { Router } from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
