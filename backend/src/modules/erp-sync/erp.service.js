import crypto from 'crypto';
import { Institute } from '../institutes/institute.model.js';

const API_KEY_BYTES = 24;
const API_KEY_PREFIX = 'erp_';

/**
 * @param {string} rawKey
 * @returns {string}
 */
export function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey() {
  return `${API_KEY_PREFIX}${crypto.randomBytes(API_KEY_BYTES).toString('hex')}`;
}

/**
 * Generate (or rotate) the ERP sync API key for an institute.
 * The raw key is returned only once and never persisted.
 *
 * @param {string} instituteId
 * @returns {Promise<{ apiKey: string, apiKeyPrefix: string, keyGeneratedAt: Date }>}
 */
export async function generateApiKey(instituteId) {
  const rawKey = generateRawKey();
  const keyGeneratedAt = new Date();
  const apiKeyPrefix = rawKey.slice(0, API_KEY_PREFIX.length + 8);

  await Institute.updateOne(
    { _id: instituteId },
    {
      $set: {
        'erpSync.enabled': true,
        'erpSync.apiKeyHash': hashApiKey(rawKey),
        'erpSync.apiKeyPrefix': apiKeyPrefix,
        'erpSync.keyGeneratedAt': keyGeneratedAt,
      },
    },
  );

  return { apiKey: rawKey, apiKeyPrefix, keyGeneratedAt };
}

/**
 * Disable ERP sync and destroy the stored key.
 * @param {string} instituteId
 */
export async function revokeApiKey(instituteId) {
  await Institute.updateOne(
    { _id: instituteId },
    {
      $set: {
        'erpSync.enabled': false,
        'erpSync.apiKeyHash': null,
        'erpSync.apiKeyPrefix': null,
        'erpSync.keyGeneratedAt': null,
      },
    },
  );
}

/**
 * @param {string} instituteId
 */
export async function getErpStatus(instituteId) {
  const institute = await Institute.findById(instituteId).select('erpSync').lean();
  const erpSync = institute?.erpSync ?? {};
  return {
    enabled: Boolean(erpSync.enabled && erpSync.apiKeyHash),
    hasKey: Boolean(erpSync.apiKeyHash),
    apiKeyPrefix: erpSync.apiKeyPrefix ?? null,
    keyGeneratedAt: erpSync.keyGeneratedAt ?? null,
    lastSyncAt: erpSync.lastSyncAt ?? null,
  };
}

/**
 * Resolve an institute by a raw API key. Returns null if the key is
 * unknown or ERP sync is disabled.
 *
 * @param {string} rawKey
 * @returns {Promise<{ instituteId: string } | null>}
 */
export async function resolveInstituteByApiKey(rawKey) {
  if (!rawKey) return null;
  const institute = await Institute.findOne({
    'erpSync.apiKeyHash': hashApiKey(rawKey),
    'erpSync.enabled': true,
  })
    .select('_id')
    .lean();

  return institute ? { instituteId: institute._id.toString() } : null;
}

/**
 * Record a successful sync poll (best-effort, non-blocking).
 * @param {string} instituteId
 */
export async function recordSync(instituteId) {
  await Institute.updateOne(
    { _id: instituteId },
    { $set: { 'erpSync.lastSyncAt': new Date() } },
  );
}
