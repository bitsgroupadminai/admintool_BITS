import * as analyticsService from './analytics.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { analyticsExportSchema, analyticsFiltersSchema } from './analytics.validator.js';

function sendExport(res, payload) {
  res.setHeader('Content-Type', payload.contentType);
  if (payload.filename) {
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
  }
  res.status(200).send(payload.body);
}

export async function adminDashboard(req, res, next) {
  try {
    const query = analyticsFiltersSchema.parse(req.query);
    const analytics = await analyticsService.getAdminDashboardAnalytics(req.user.instituteId, query);
    sendSuccess(res, 200, 'Dashboard analytics', { analytics });
  } catch (err) {
    next(err);
  }
}

export async function staffDashboard(req, res, next) {
  try {
    const query = analyticsFiltersSchema.parse(req.query);
    const analytics = await analyticsService.getStaffDashboardAnalytics(
      req.user.instituteId,
      req.user.userId,
      query,
    );
    sendSuccess(res, 200, 'Staff dashboard analytics', { analytics });
  } catch (err) {
    next(err);
  }
}

export async function exportAdminDashboard(req, res, next) {
  try {
    const query = analyticsExportSchema.parse(req.query);
    const payload = await analyticsService.exportAdminAnalytics(req.user.instituteId, query);
    sendExport(res, payload);
  } catch (err) {
    next(err);
  }
}

export async function exportStaffDashboard(req, res, next) {
  try {
    const query = analyticsExportSchema.parse(req.query);
    const payload = await analyticsService.exportStaffAnalytics(
      req.user.instituteId,
      req.user.userId,
      query,
    );
    sendExport(res, payload);
  } catch (err) {
    next(err);
  }
}
