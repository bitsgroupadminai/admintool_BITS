import { Router } from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../core/middlewares/requireAuth.middleware.js';
import { avatarUpload } from '../../core/config/upload.js';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/profile', requireAuth, authController.updateProfile);
router.post(
  '/profile/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  authController.uploadProfileAvatar,
);
router.delete('/profile/avatar', requireAuth, authController.removeProfileAvatar);

export default router;
