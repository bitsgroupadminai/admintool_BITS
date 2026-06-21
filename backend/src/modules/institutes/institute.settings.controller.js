import { z } from 'zod';
import * as instituteSettingsService from './institute.settings.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

const autoAssignmentSchema = z.object({
  enabled: z.boolean().optional(),
  strategy: z.enum(['least_loaded']).optional(),
});

const calendarExceptionSchema = z.object({
  date: z.string().min(10).max(10),
  type: z.enum(['closed', 'modified_hours']),
  reason: z.string().max(200).optional(),
  operatingHoursStart: z.string().optional(),
  operatingHoursEnd: z.string().optional(),
});

const operationsCalendarSchema = z.object({
  defaultOperatingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  exceptions: z.array(calendarExceptionSchema).max(120).optional(),
});

export async function getAutoAssignment(req, res, next) {
  try {
    const config = await instituteSettingsService.getAutoAssignmentConfig(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Auto-assignment config', { autoAssignment: config });
  } catch (err) {
    next(err);
  }
}

export async function updateAutoAssignment(req, res, next) {
  try {
    const payload = autoAssignmentSchema.parse(req.body);
    const config = await instituteSettingsService.updateAutoAssignmentConfig(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Auto-assignment config updated', { autoAssignment: config });
  } catch (err) {
    next(err);
  }
}

export async function getOperationsCalendar(req, res, next) {
  try {
    const calendar = await instituteSettingsService.getOperationsCalendar(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Operations calendar', { operationsCalendar: calendar });
  } catch (err) {
    next(err);
  }
}

export async function updateOperationsCalendar(req, res, next) {
  try {
    const payload = operationsCalendarSchema.parse(req.body);
    const calendar = await instituteSettingsService.updateOperationsCalendar(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Operations calendar updated', { operationsCalendar: calendar });
  } catch (err) {
    next(err);
  }
}
