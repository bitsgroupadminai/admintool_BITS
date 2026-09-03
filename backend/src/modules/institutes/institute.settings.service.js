import { Institute } from './institute.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { getInstituteForUser } from './institute.service.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { isValidDateKey } from '../../shared/helpers/calendarExceptions.helper.js';

const DEFAULT_AUTO_ASSIGNMENT = {
  enabled: true,
  strategy: 'least_loaded',
};

const DEFAULT_OPERATIONS_CALENDAR = {
  defaultOperatingDays: [1, 2, 3, 4, 5],
  exceptions: [],
};

const DEFAULT_AI_VERIFICATION = {
  allowSampleDocuments: false,
};

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 */
export async function getAutoAssignmentConfig(instituteId, userInstituteId) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  return institute.autoAssignmentConfig ?? DEFAULT_AUTO_ASSIGNMENT;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 * @param {{ enabled?: boolean, strategy?: string }} payload
 */
export async function updateAutoAssignmentConfig(instituteId, userInstituteId, payload) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  const current = institute.autoAssignmentConfig ?? DEFAULT_AUTO_ASSIGNMENT;
  institute.autoAssignmentConfig = {
    enabled: payload.enabled ?? current.enabled,
    strategy: payload.strategy ?? current.strategy,
  };
  await institute.save();
  await flushInstituteReadCache(instituteId);
  return institute.autoAssignmentConfig;
}

/**
 * Read auto-assignment config for internal use (no auth check).
 * @param {string} instituteId
 */
export async function readAutoAssignmentConfig(instituteId) {
  const institute = await Institute.findById(instituteId).select('autoAssignmentConfig');
  if (!institute) return DEFAULT_AUTO_ASSIGNMENT;
  return institute.autoAssignmentConfig ?? DEFAULT_AUTO_ASSIGNMENT;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 */
export async function getAiVerificationConfig(instituteId, userInstituteId) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  return institute.aiVerificationConfig ?? DEFAULT_AI_VERIFICATION;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 * @param {{ allowSampleDocuments?: boolean }} payload
 */
export async function updateAiVerificationConfig(instituteId, userInstituteId, payload) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  const current = institute.aiVerificationConfig ?? DEFAULT_AI_VERIFICATION;
  institute.aiVerificationConfig = {
    allowSampleDocuments: payload.allowSampleDocuments ?? current.allowSampleDocuments,
  };
  await institute.save();
  await flushInstituteReadCache(instituteId);
  return institute.aiVerificationConfig;
}

/**
 * Read AI verification config for internal use (no auth check).
 * @param {string} instituteId
 */
export async function readAiVerificationConfig(instituteId) {
  const institute = await Institute.findById(instituteId).select('aiVerificationConfig');
  if (!institute) return DEFAULT_AI_VERIFICATION;
  return institute.aiVerificationConfig ?? DEFAULT_AI_VERIFICATION;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 */
export async function getOperationsCalendar(instituteId, userInstituteId) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  return institute.operationsCalendar ?? DEFAULT_OPERATIONS_CALENDAR;
}

/**
 * @param {string} instituteId
 */
export async function readOperationsCalendar(instituteId) {
  const institute = await Institute.findById(instituteId).select('operationsCalendar');
  if (!institute) return DEFAULT_OPERATIONS_CALENDAR;
  return institute.operationsCalendar ?? DEFAULT_OPERATIONS_CALENDAR;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 * @param {{ defaultOperatingDays?: number[], exceptions?: Array<{ date: string, type: string, reason?: string, operatingHoursStart?: string, operatingHoursEnd?: string }> }} payload
 */
export async function updateOperationsCalendar(instituteId, userInstituteId, payload) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  const current = institute.operationsCalendar ?? DEFAULT_OPERATIONS_CALENDAR;

  const defaultOperatingDays = payload.defaultOperatingDays ?? current.defaultOperatingDays;
  if (!Array.isArray(defaultOperatingDays) || defaultOperatingDays.length === 0) {
    throw new AppError('Select at least one operating day', 400);
  }

  const exceptions = (payload.exceptions ?? current.exceptions ?? []).map((item) => {
    if (!isValidDateKey(item.date)) {
      throw new AppError(`Invalid date format: ${item.date}`, 400);
    }
    if (!['closed', 'modified_hours'].includes(item.type)) {
      throw new AppError(`Invalid exception type for ${item.date}`, 400);
    }
    return {
      date: item.date,
      type: item.type,
      reason: item.reason?.trim() ?? '',
      operatingHoursStart: item.operatingHoursStart,
      operatingHoursEnd: item.operatingHoursEnd,
    };
  });

  institute.operationsCalendar = {
    defaultOperatingDays,
    exceptions,
  };
  await institute.save();
  await flushInstituteReadCache(instituteId);
  return institute.operationsCalendar;
}
