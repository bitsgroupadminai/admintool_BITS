import { AppError } from '../utils/AppError.js';
import { getSession, touchSession } from '../services/session.service.js';
import { readSessionId, setSessionCookie } from './sessionCookie.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  try {
    const sessionId = readSessionId(req);
    if (!sessionId) {
      throw new AppError('Authentication required', 401);
    }

    const session = await getSession(sessionId);
    if (!session) {
      throw new AppError('Session expired. Please log in again.', 401);
    }

    await touchSession(sessionId, session);
    setSessionCookie(res, sessionId);
    req.sessionId = sessionId;
    req.user = session;
    next();
  } catch (err) {
    next(err);
  }
}

export { SESSION_COOKIE } from './sessionCookie.js';
