/**
 * Intake date windows for student visibility use institute calendar days
 * (Asia/Kolkata), not raw UTC timestamps from the browser.
 */

export const INSTITUTE_TIME_ZONE = 'Asia/Kolkata';

/**
 * @param {Date|string|number} value
 * @param {string} [timeZone]
 * @returns {string} YYYY-MM-DD
 */
export function calendarDateInTimeZone(value, timeZone = INSTITUTE_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

/**
 * Active offering is visible when "today" in the institute TZ is within
 * [startDate, endDate] inclusive calendar days (missing bound = open).
 * @param {{ startDate?: Date|null, endDate?: Date|null }} offering
 * @param {Date} [now]
 */
export function isWithinOfferingDates(offering, now = new Date()) {
  const today = calendarDateInTimeZone(now);
  if (offering.startDate) {
    const start = calendarDateInTimeZone(offering.startDate);
    if (today < start) return false;
  }
  if (offering.endDate) {
    const end = calendarDateInTimeZone(offering.endDate);
    if (today > end) return false;
  }
  return true;
}

/**
 * Looser Mongo bounds: include anything that could be "today" in IST
 * (±1 day cushion for UTC storage skew). Final gate is isWithinOfferingDates.
 * @param {Date} [now]
 */
export function offeringDateQueryBounds(now = new Date()) {
  const startPad = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const endPad = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  return {
    $and: [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: endPad } },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: startPad } },
        ],
      },
    ],
  };
}
