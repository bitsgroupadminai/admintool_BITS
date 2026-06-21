const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/**
 * Normalize user or AI input into 24-hour HH:mm, or null when invalid.
 * Accepts "9:00", "09:00", or bare hours like "9" / "14" (interpreted as :00).
 * @param {string | number | null | undefined} value
 * @param {string} [fallback]
 */
export function normalizeOperatingHoursTime(value, fallback = null) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  if (TIME_PATTERN.test(raw)) {
    const [, hourPart, minutePart] = raw.match(TIME_PATTERN);
    const hours = Number(hourPart);
    const minutes = Number(minutePart);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return fallback;
  }

  if (/^\d{1,2}$/.test(raw)) {
    const hours = Number(raw);
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, '0')}:00`;
    }
  }

  return fallback;
}

/**
 * @param {string | null | undefined} start
 * @param {string | null | undefined} end
 */
export function validateOperatingHoursWindow(start, end) {
  const normalizedStart = normalizeOperatingHoursTime(start);
  const normalizedEnd = normalizeOperatingHoursTime(end);

  if (!normalizedStart || !normalizedEnd) {
    return {
      valid: false,
      reason: 'invalid_format',
      start: normalizedStart,
      end: normalizedEnd,
    };
  }

  const [startHour, startMinute] = normalizedStart.split(':').map(Number);
  const [endHour, endMinute] = normalizedEnd.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      reason: 'end_before_start',
      start: normalizedStart,
      end: normalizedEnd,
    };
  }

  return {
    valid: true,
    start: normalizedStart,
    end: normalizedEnd,
  };
}

/**
 * @param {{ operatingHoursStart?: string, operatingHoursEnd?: string } | null | undefined} config
 */
export function getAppointmentHoursIssue(config) {
  if (!config?.operatingHoursStart || !config?.operatingHoursEnd) {
    return 'missing_hours';
  }

  const validation = validateOperatingHoursWindow(
    config.operatingHoursStart,
    config.operatingHoursEnd,
  );

  if (!validation.valid) {
    return validation.reason;
  }

  return null;
}

/**
 * @param {string | null | undefined} value
 */
export function formatOperatingHoursLabel(value) {
  const normalized = normalizeOperatingHoursTime(value);
  if (!normalized) return value ?? '—';

  const [hours, minutes] = normalized.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
