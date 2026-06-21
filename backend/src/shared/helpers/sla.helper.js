import { SLA_UNIT } from '../enums/offering.enums.js';

/**
 * @param {{ slaValue?: number, slaUnit?: string }} step
 * @param {Date} [fromDate]
 */
export function calculateSlaDueAt(step, fromDate = new Date()) {
  const value = step?.slaValue ?? 24;
  const unit = step?.slaUnit ?? SLA_UNIT.HOURS;

  let milliseconds = value * 60 * 60 * 1000;
  if (unit === SLA_UNIT.MINUTES) {
    milliseconds = value * 60 * 1000;
  } else if (unit === SLA_UNIT.DAYS) {
    milliseconds = value * 24 * 60 * 60 * 1000;
  }

  return new Date(fromDate.getTime() + milliseconds);
}

/**
 * @param {Date | null | undefined} dueAt
 */
export function isSlaOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

/**
 * @param {Date | null | undefined} dueAt
 */
export function getSlaRemainingMs(dueAt) {
  if (!dueAt) return null;
  return Math.max(0, new Date(dueAt).getTime() - Date.now());
}
