import { env } from '../config/env.js';

export const SESSION_COOKIE = 'sid';

/**
 * @param {number} [maxAgeMs]
 */
export function getSessionCookieOptions(maxAgeMs) {
  const ttlMs = maxAgeMs ?? env.SESSION_INACTIVITY_HOURS * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ttlMs,
    path: '/',
  };
}

/**
 * @param {import('express').Response} res
 * @param {string} sessionId
 */
export function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, getSessionCookieOptions());
}

/**
 * @param {import('express').Response} res
 */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, getSessionCookieOptions(0));
}
