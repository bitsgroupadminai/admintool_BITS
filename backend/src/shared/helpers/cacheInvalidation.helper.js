import { cacheDelete, cacheDeleteByPrefix } from '../../core/services/cache.service.js';
import { buildReadCacheKey } from './cachedRead.helper.js';
import { cacheNs } from '../constants/cacheKeys.js';

const INSTITUTE_SCOPED_NAMESPACES = Object.values(cacheNs).filter(
  (ns) => ns !== cacheNs.STUDENT_INSTITUTES,
);

/**
 * @param {string} namespace
 * @param {unknown[]} parts
 */
export async function invalidateReadExact(namespace, parts) {
  await cacheDelete(buildReadCacheKey(namespace, parts));
}

/**
 * @param {string} namespace
 * @param {unknown[]} [prefixParts]
 */
export async function invalidateReadByPrefix(namespace, prefixParts = []) {
  const prefixKey = buildReadCacheKey(namespace, prefixParts);
  // Always delete the exact key first. Redis Cloud / managed Redis often
  // restricts SCAN, which would leave stale read-through entries (e.g. empty
  // student programme lists) for the full 12h TTL after activate/update.
  await cacheDelete(prefixKey);
  await cacheDeleteByPrefix(prefixKey);
}

/**
 * Flush all institute-scoped read cache after create / update / delete.
 * @param {string} instituteId
 */
export async function flushInstituteReadCache(instituteId) {
  await Promise.all(
    INSTITUTE_SCOPED_NAMESPACES.map((namespace) => invalidateReadByPrefix(namespace, [instituteId])),
  );
}

/** Portal institute picker (not scoped to a single institute id). */
export async function flushStudentInstitutesCache() {
  await invalidateReadByPrefix(cacheNs.STUDENT_INSTITUTES);
}
