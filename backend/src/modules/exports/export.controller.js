import * as exportService from './export.service.js';
import { exportRecordsSchema } from './export.validator.js';

/**
 * GET /api/v1/exports/applications
 * Export service-request records as CSV, XLSX, or JSON.
 */
export async function exportApplications(req, res, next) {
  try {
    const query = exportRecordsSchema.parse(req.query);
    const payload = await exportService.exportApplicationRecords(req.user.instituteId, query);

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    res.status(200).send(payload.body);
  } catch (err) {
    next(err);
  }
}
