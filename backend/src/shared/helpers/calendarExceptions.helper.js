import { validateOperatingHoursWindow } from './operatingHours.helper.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {Date} date
 */
export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {string | null | undefined} value
 */
export function isValidDateKey(value) {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === value;
}

/**
 * @param {{ defaultOperatingDays?: number[], exceptions?: Array<{ date: string, type: string, reason?: string, operatingHoursStart?: string, operatingHoursEnd?: string }> } | null | undefined} calendar
 * @param {Date} day
 */
export function resolveDayAvailability(calendar, day) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dateKey = toDateKey(dayStart);
  const defaultDays = calendar?.defaultOperatingDays?.length
    ? calendar.defaultOperatingDays
    : [1, 2, 3, 4, 5];

  const exception = (calendar?.exceptions ?? []).find((item) => item.date === dateKey);

  if (exception?.type === 'closed') {
    return {
      open: false,
      reason: exception.reason ?? 'Office closed',
      operatingHoursStart: null,
      operatingHoursEnd: null,
    };
  }

  if (exception?.type === 'modified_hours') {
    const hours = validateOperatingHoursWindow(
      exception.operatingHoursStart,
      exception.operatingHoursEnd,
    );
    if (hours.valid) {
      return {
        open: true,
        reason: exception.reason ?? 'Modified hours',
        operatingHoursStart: hours.start,
        operatingHoursEnd: hours.end,
      };
    }
  }

  const weekday = dayStart.getDay();
  if (!defaultDays.includes(weekday)) {
    return {
      open: false,
      reason: 'Closed on this day of the week',
      operatingHoursStart: null,
      operatingHoursEnd: null,
    };
  }

  return {
    open: true,
    reason: null,
    operatingHoursStart: null,
    operatingHoursEnd: null,
  };
}

/**
 * @param {{ defaultOperatingDays?: number[], exceptions?: Array<{ date: string, type: string, reason?: string }> } | null | undefined} calendar
 * @param {Date} from
 * @param {number} daysAhead
 */
export function listUpcomingClosures(calendar, from = new Date(), daysAhead = 30) {
  const closures = [];
  const seen = new Set();

  for (const exception of calendar?.exceptions ?? []) {
    if (exception.type !== 'closed' || !isValidDateKey(exception.date)) continue;
    const date = new Date(`${exception.date}T12:00:00`);
    if (date >= from) {
      closures.push({
        date: exception.date,
        reason: exception.reason ?? 'Office closed',
      });
      seen.add(exception.date);
    }
  }

  const defaultDays = calendar?.defaultOperatingDays?.length
    ? calendar.defaultOperatingDays
    : [1, 2, 3, 4, 5];

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    day.setHours(12, 0, 0, 0);
    const dateKey = toDateKey(day);
    if (seen.has(dateKey)) continue;
    if (!defaultDays.includes(day.getDay())) {
      closures.push({
        date: dateKey,
        reason: 'Regular weekly closure',
      });
    }
  }

  return closures.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 14);
}
