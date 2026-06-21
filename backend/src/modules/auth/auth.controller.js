import { signupSchema, loginSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validator.js';

import * as passwordResetService from '../../core/services/passwordReset.service.js';

import * as authService from './auth.service.js';

import { sendSuccess } from '../../core/utils/apiResponse.js';

import { AppError } from '../../core/utils/AppError.js';

import { setSessionCookie, clearSessionCookie } from '../../core/middlewares/sessionCookie.js';



export async function signup(req, res, next) {

  try {

    const payload = signupSchema.parse(req.body);

    const { session, user } = await authService.signupAdmin(payload);

    setSessionCookie(res, session.sessionId);

    sendSuccess(res, 201, 'Account created successfully', { user });

  } catch (err) {

    next(err);

  }

}



export async function login(req, res, next) {

  try {

    const payload = loginSchema.parse(req.body);

    const { session, user } = await authService.loginUser(payload);

    setSessionCookie(res, session.sessionId);

    sendSuccess(res, 200, 'Logged in successfully', { user });

  } catch (err) {

    next(err);

  }

}



export async function logout(req, res, next) {

  try {

    await authService.logoutUser(req.sessionId);

    clearSessionCookie(res);

    sendSuccess(res, 200, 'Logged out successfully');

  } catch (err) {

    next(err);

  }

}



export async function me(req, res, next) {

  try {

    const user = await authService.getCurrentUser(req.user.userId);

    sendSuccess(res, 200, 'Current user', { user });

  } catch (err) {

    next(err);

  }

}



export async function updateProfile(req, res, next) {

  try {

    const payload = updateProfileSchema.parse(req.body);

    const user = await authService.updateCurrentUserProfile(

      req.user.userId,

      payload,

      req.sessionId,

    );

    sendSuccess(res, 200, 'Profile updated', { user });

  } catch (err) {

    next(err);

  }

}



export async function uploadProfileAvatar(req, res, next) {

  try {

    if (!req.file) {

      return next(new AppError('No profile photo provided', 400));

    }

    const user = await authService.uploadUserAvatar(req.user.userId, req.file);

    sendSuccess(res, 200, 'Profile photo updated', { user });

  } catch (err) {

    next(err);

  }

}



export async function removeProfileAvatar(req, res, next) {

  try {

    const user = await authService.removeUserAvatar(req.user.userId);

    sendSuccess(res, 200, 'Profile photo removed', { user });

  } catch (err) {

    next(err);

  }

}



export async function forgotPassword(req, res, next) {

  try {

    const { email } = forgotPasswordSchema.parse(req.body);

    const result = await passwordResetService.requestPasswordReset(email);

    sendSuccess(res, 200, result.message);

  } catch (err) {

    next(err);

  }

}



export async function resetPassword(req, res, next) {

  try {

    const { token, password } = resetPasswordSchema.parse(req.body);

    await passwordResetService.resetPasswordWithToken(token, password);

    sendSuccess(res, 200, 'Password updated. You can sign in with your new password.');

  } catch (err) {

    next(err);

  }

}


