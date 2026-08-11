import { env } from '../config/env.js';

export const SESSION_COOKIE = 'sid';

/**
 * Cross-site cookies (Vercel frontends → Railway API) require SameSite=None; Secure.
 * Local same-origin / proxied Vite keeps Lax.
 * @param {number} [maxAgeMs]
 */
export function getSessionCookieOptions(maxAgeMs) {
  const ttlMs = maxAgeMs ?? env.SESSION_INACTIVITY_HOURS * 60 * 60 * 1000;
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
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
