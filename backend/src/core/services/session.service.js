import crypto from 'crypto';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';

const SESSION_PREFIX = 'session:';
const inactivitySeconds = env.SESSION_INACTIVITY_HOURS * 60 * 60;

/**
 * @param {string} sessionId
 * @returns {string}
 */
function sessionKey(sessionId) {
  return `${SESSION_PREFIX}${sessionId}`;
}

/**
 * @param {Object} payload
 * @returns {Promise<{ sessionId: string, ttl: number }>}
 */
export async function createSession(payload) {
  const sessionId = crypto.randomUUID();
  const key = sessionKey(sessionId);
  await redisClient.setEx(key, inactivitySeconds, JSON.stringify(payload));
  return { sessionId, ttl: inactivitySeconds };
}

/**
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
export async function getSession(sessionId) {
  const data = await redisClient.get(sessionKey(sessionId));
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Refresh session TTL on activity
 * @param {string} sessionId
 * @param {Object} payload
 * @returns {Promise<void>}
 */
export async function touchSession(sessionId, payload) {
  const key = sessionKey(sessionId);
  await redisClient.setEx(key, inactivitySeconds, JSON.stringify(payload));
}

/**
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function destroySession(sessionId) {
  await redisClient.del(sessionKey(sessionId));
}

/**
 * Count active sessions by scanning Redis. Used by monitoring/metrics.
 * @returns {Promise<number>}
 */
export async function countActiveSessions() {
  let count = 0;
  for await (const _key of redisClient.scanIterator({
    MATCH: `${SESSION_PREFIX}*`,
    COUNT: 200,
  })) {
    count += 1;
  }
  return count;
}
