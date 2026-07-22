import * as erpService from './erp.service.js';
import { erpListSchema } from './erp.validator.js';
import {
  fetchApplicationRecords,
  fetchApplicationRecordById,
} from '../exports/export.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/index.js';

/* ---------------------------- Admin management ---------------------------- */

export async function getStatus(req, res, next) {
  try {
    const status = await erpService.getErpStatus(req.user.instituteId);
    sendSuccess(res, 200, 'ERP sync status', { erpSync: status });
  } catch (err) {
    next(err);
  }
}

export async function rotateApiKey(req, res, next) {
  try {
    const result = await erpService.generateApiKey(req.user.instituteId);
    sendSuccess(res, 201, 'ERP API key generated. Copy it now — it will not be shown again.', {
      apiKey: result.apiKey,
      apiKeyPrefix: result.apiKeyPrefix,
      keyGeneratedAt: result.keyGeneratedAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeApiKey(req, res, next) {
  try {
    await erpService.revokeApiKey(req.user.instituteId);
    const status = await erpService.getErpStatus(req.user.instituteId);
    sendSuccess(res, 200, 'ERP sync disabled and API key revoked', { erpSync: status });
  } catch (err) {
    next(err);
  }
}

/* ------------------------- API-key protected sync ------------------------- */

/**
 * GET /api/v1/erp/applications
 * Incremental, keyset-paginated feed of service-request records for ERP sync.
 */
export async function listApplications(req, res, next) {
  try {
    const query = erpListSchema.parse(req.query);
    const limit = Math.min(query.limit ?? env.ERP_SYNC_MAX_PAGE_SIZE, env.ERP_SYNC_MAX_PAGE_SIZE);

    const result = await fetchApplicationRecords(req.erpInstituteId, {
      updatedSince: query.updatedSince ? new Date(query.updatedSince) : undefined,
      status: query.status,
      cursor: query.cursor,
      limit,
    });

    erpService.recordSync(req.erpInstituteId).catch((err) => {
      logger.warn({ err, instituteId: req.erpInstituteId }, 'Failed to record ERP sync timestamp');
    });

    sendSuccess(res, 200, 'Service request records', {
      records: result.records,
      pagination: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/erp/applications/:id
 */
export async function getApplication(req, res, next) {
  try {
    const record = await fetchApplicationRecordById(req.erpInstituteId, req.params.id);
    if (!record) {
      throw new AppError('Record not found', 404);
    }
    sendSuccess(res, 200, 'Service request record', { record });
  } catch (err) {
    next(err);
  }
}
