import { env } from '../config/env.js';

export const SESSION_COOKIE = 'sid';

function isLocalClientUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Frontends live on Vercel; the API is on another site. Use cross-site cookie
 * flags whenever a client URL is not localhost — do not rely on NODE_ENV alone.
 */
function useCrossSiteCookies() {
  return !(isLocalClientUrl(env.ADMIN_CLIENT_URL) && isLocalClientUrl(env.STUDENT_CLIENT_URL));
}

/**
 * Cross-site cookies (Vercel frontends → Railway API) require SameSite=None; Secure.
 * Partitioned (CHIPS) keeps the cookie when Chrome blocks third-party cookies.
 * Local same-origin / proxied Vite keeps Lax.
 * @param {number} [maxAgeMs]
 */
export function getSessionCookieOptions(maxAgeMs) {
  const ttlMs = maxAgeMs ?? env.SESSION_INACTIVITY_HOURS * 60 * 60 * 1000;
  const crossSite = useCrossSiteCookies();
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    ...(crossSite ? { partitioned: true } : {}),
    maxAge: ttlMs,
    path: '/',
  };
}

/**
 * @param {import('express').Request} req
 * @returns {string | undefined}
 */
export function readSessionId(req) {
  const fromCookie = req.cookies?.[SESSION_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)/i);
  return match?.[1];
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
