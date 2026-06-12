import { signupSchema, loginSchema } from './auth.validator.js';
import * as authService from './auth.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { SESSION_COOKIE } from '../../core/middlewares/requireAuth.middleware.js';
import { env } from '../../core/config/env.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function setSessionCookie(res, sessionId, ttl) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ttl * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

export async function signup(req, res, next) {
  try {
    const payload = signupSchema.parse(req.body);
    const { session, user } = await authService.signupAdmin(payload);
    setSessionCookie(res, session.sessionId, session.ttl);
    sendSuccess(res, 201, 'Account created successfully', { user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const { session, user } = await authService.loginUser(payload);
    setSessionCookie(res, session.sessionId, session.ttl);
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
