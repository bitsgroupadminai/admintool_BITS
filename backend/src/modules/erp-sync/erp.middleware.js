import { AppError } from '../../core/utils/AppError.js';
import { resolveInstituteByApiKey } from './erp.service.js';

/**
 * Authenticate machine-to-machine ERP sync requests via API key.
 * Accepts the key in the `x-api-key` header or `Authorization: Bearer <key>`.
 *
 * @type {import('express').RequestHandler}
 */
export async function requireErpApiKey(req, _res, next) {
  try {
    const headerKey = req.get('x-api-key');
    const authHeader = req.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;

    const rawKey = headerKey?.trim() || bearerKey;
    if (!rawKey) {
      throw new AppError('API key required', 401);
    }

    const resolved = await resolveInstituteByApiKey(rawKey);
    if (!resolved) {
      throw new AppError('Invalid or revoked API key', 401);
    }

    req.erpInstituteId = resolved.instituteId;
    next();
  } catch (err) {
    next(err);
  }
}
