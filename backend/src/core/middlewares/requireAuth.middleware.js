import { AppError } from '../utils/AppError.js';
import { getSession, touchSession } from '../services/session.service.js';

const SESSION_COOKIE = 'sid';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, _res, next) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      throw new AppError('Authentication required', 401);
    }

    const session = await getSession(sessionId);
    if (!session) {
      throw new AppError('Session expired. Please log in again.', 401);
    }

    await touchSession(sessionId, session);
    req.sessionId = sessionId;
    req.user = session;
    next();
  } catch (err) {
    next(err);
  }
}

export { SESSION_COOKIE };
