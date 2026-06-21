import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';

const CACHE_PREFIX = 'cache:';

export function isCacheEnabled() {
  return env.CACHE_ENABLED;
}

/**
 * @param {string} key
 */
function fullKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * @param {string} key
 * @returns {Promise<unknown | null>}
 */
export async function cacheGetJson(key) {
  if (!isCacheEnabled()) return null;

  try {
    const raw = await redisClient.get(fullKey(key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ err, key }, 'Cache read failed');
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlSeconds
 */
export async function cacheSetJson(key, value, ttlSeconds) {
  if (!isCacheEnabled()) return;

  try {
    await redisClient.setEx(fullKey(key), ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn({ err, key }, 'Cache write failed');
  }
}

/**
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<T>} loader
 * @returns {Promise<T>}
 */
export async function remember(key, ttlSeconds, loader) {
  if (!isCacheEnabled()) {
    return loader();
  }

  const cached = await cacheGetJson(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await cacheSetJson(key, value, ttlSeconds);
  return value;
}

/**
 * @param {string} key
 */
export async function cacheDelete(key) {
  if (!isCacheEnabled()) return;

  try {
    await redisClient.del(fullKey(key));
  } catch (err) {
    logger.warn({ err, key }, 'Cache delete failed');
  }
}

/**
 * Delete all keys whose logical key starts with keyPrefix (before Redis prefix).
 * @param {string} keyPrefix
 */
export async function cacheDeleteByPrefix(keyPrefix) {
  if (!isCacheEnabled()) return;

  const pattern = `${CACHE_PREFIX}${keyPrefix}*`;

  try {
    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
      if (keys.length >= 100) {
        await redisClient.del(keys);
        keys.length = 0;
      }
    }
    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (err) {
    logger.warn({ err, keyPrefix }, 'Cache prefix delete failed');
  }
}
