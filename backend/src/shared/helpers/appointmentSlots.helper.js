import {
  normalizeOperatingHoursTime,
  validateOperatingHoursWindow,
} from './operatingHours.helper.js';
import { resolveDayAvailability } from './calendarExceptions.helper.js';

/**
 * Normalize appointment slot start to minute precision for consistent storage and lookup.
 * @param {Date | string} value
 */
export function normalizeSlotStart(value) {
  const date = new Date(value);
  date.setSeconds(0, 0);
  return date;
}

/**
 * @param {Date} baseDate
 * @param {string | undefined | null} timeString
 * @param {string} fallback
 */
export function parseOperatingTime(baseDate, timeString, fallback) {
  const normalized = normalizeOperatingHoursTime(timeString, fallback) ?? fallback;
  const [hours, minutes] = normalized.split(':').map((part) => Number(part));
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * @param {import('../../modules/offerings/offering.model.js').Offering} offering
 * @param {Date} day
 * @param {{ defaultOperatingDays?: number[], exceptions?: Array<{ date: string, type: string, reason?: string, operatingHoursStart?: string, operatingHoursEnd?: string }> } | null | undefined} [instituteCalendar]
 */
export function buildOfferingDaySlots(offering, day, instituteCalendar = null) {
  const config = offering.appointmentConfig ?? {};
  const operatingDays = config.operatingDays?.length
    ? config.operatingDays
    : instituteCalendar?.defaultOperatingDays?.length
      ? instituteCalendar.defaultOperatingDays
      : [1, 2, 3, 4, 5];

  const dayAvailability = resolveDayAvailability(
    {
      defaultOperatingDays: operatingDays,
      exceptions: instituteCalendar?.exceptions ?? [],
    },
    day,
  );

  if (!dayAvailability.open) {
    return [];
  }

  const duration = config.slotDurationMinutes ?? 30;
  const capacity = Math.max(1, config.slotCapacity ?? 3);

  const hoursStart =
    dayAvailability.operatingHoursStart ?? config.operatingHoursStart;
  const hoursEnd =
    dayAvailability.operatingHoursEnd ?? config.operatingHoursEnd;

  const hours = validateOperatingHoursWindow(hoursStart, hoursEnd);

  if (!hours.valid) {
    return [];
  }

  const start = parseOperatingTime(day, hours.start, '09:00');
  const end = parseOperatingTime(day, hours.end, '17:00');

  if (end <= start) {
    return [];
  }

  const slots = [];
  for (
    let cursor = normalizeSlotStart(start);
    cursor < end;
    cursor = normalizeSlotStart(new Date(cursor.getTime() + duration * 60000))
  ) {
    const slotEnd = new Date(cursor.getTime() + duration * 60000);
    if (slotEnd > end) break;
    slots.push({
      slotStart: new Date(cursor),
      slotEnd,
      capacity,
    });
  }

  return slots;
}

/**
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @param {{ slotStart: Date }[]} bookings
 */
export function countBookingsBySlot(bookings) {
  const counts = new Map();
  for (const booking of bookings) {
    const key = normalizeSlotStart(booking.slotStart).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Align bookings to generated offering slot windows so counts stay accurate even when
 * stored slotStart timestamps differ slightly from the current grid.
 *
 * @param {import('../../modules/offerings/offering.model.js').Offering} offering
 * @param {{ slotStart: Date }[]} bookings
 * @param {number} horizon
 * @param {Date} now
 * @param {{ defaultOperatingDays?: number[], exceptions?: Array<{ date: string, type: string, reason?: string, operatingHoursStart?: string, operatingHoursEnd?: string }> } | null | undefined} [instituteCalendar]
 */
export function mapBookingsToSlotCounts(offering, bookings, horizon, now, instituteCalendar = null) {
  const counts = new Map();
  const slotWindows = [];

  for (let offset = 0; offset < horizon; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    day.setHours(0, 0, 0, 0);

    for (const slot of buildOfferingDaySlots(offering, day, instituteCalendar)) {
      slotWindows.push({
        key: normalizeSlotStart(slot.slotStart).toISOString(),
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
      });
    }
  }

  for (const booking of bookings) {
    const bookingStart = normalizeSlotStart(booking.slotStart);
    const matched = slotWindows.find(
      (window) => bookingStart >= window.slotStart && bookingStart < window.slotEnd,
    );

    if (matched) {
      counts.set(matched.key, (counts.get(matched.key) ?? 0) + 1);
      continue;
    }

    const fallbackKey = bookingStart.toISOString();
    counts.set(fallbackKey, (counts.get(fallbackKey) ?? 0) + 1);
  }

  return { counts, slotWindows };
}

/**
 * @param {Date | string} slotStart
 * @param {{ key: string, slotStart: Date, slotEnd: Date }[]} slotWindows
 */
export function findSlotWindowForStart(slotStart, slotWindows) {
  const target = normalizeSlotStart(slotStart);
  return slotWindows.find((window) => window.slotStart.getTime() === target.getTime()) ?? null;
}
