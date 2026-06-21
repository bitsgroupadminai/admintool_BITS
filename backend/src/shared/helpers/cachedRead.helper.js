import crypto from 'crypto';
import { remember, isCacheEnabled } from '../../core/services/cache.service.js';
import { getDefaultCacheTtl } from '../constants/cacheKeys.js';

/**
 * @param {unknown} value
 */
function stablePart(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    const sorted = Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }
  return String(value);
}

/**
 * @param {string} namespace
 * @param {unknown[]} parts
 */
export function buildReadCacheKey(namespace, parts) {
  if (!parts.length) {
    return namespace;
  }

  const head = stablePart(parts[0]);
  const tailParts = parts.slice(1);

  if (!tailParts.length) {
    return `${namespace}|${head}`;
  }

  const tailSerialized = tailParts.map(stablePart).join('|');
  const combined = `${head}|${tailSerialized}`;

  if (combined.length <= 160) {
    return `${namespace}|${combined}`;
  }

  const hash = crypto.createHash('sha256').update(tailSerialized).digest('hex').slice(0, 24);
  return `${namespace}|${head}|${hash}`;
}

/**
 * Read-through cache: check Redis first, load from MongoDB on miss, store for 12h TTL.
 * DB mutations must call flushInstituteReadCache() so edits/deletes invalidate stale entries.
 *
 * @template T
 * @param {string} namespace
 * @param {unknown[]} parts
 * @param {() => Promise<T>} loader
 * @param {number} [ttlSeconds]
 * @returns {Promise<T>}
 */
export async function cachedRead(namespace, parts, loader, ttlSeconds = getDefaultCacheTtl()) {
  if (!isCacheEnabled()) {
    return loader();
  }

  const key = buildReadCacheKey(namespace, parts);
  return remember(key, ttlSeconds, loader);
}
