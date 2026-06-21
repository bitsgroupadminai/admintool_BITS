export function normalizeOperatingHoursTime(value, fallback = null) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
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

export function validateOperatingHoursInput(start, end) {
  const normalizedStart = normalizeOperatingHoursTime(start);
  const normalizedEnd = normalizeOperatingHoursTime(end);

  if (!normalizedStart || !normalizedEnd) {
    return {
      valid: false,
      message: 'Use 24-hour times like 09:00 and 17:00.',
    };
  }

  const startMinutes =
    Number(normalizedStart.split(':')[0]) * 60 + Number(normalizedStart.split(':')[1]);
  const endMinutes =
    Number(normalizedEnd.split(':')[0]) * 60 + Number(normalizedEnd.split(':')[1]);

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      message: 'Closing time must be after opening time.',
    };
  }

  return {
    valid: true,
    start: normalizedStart,
    end: normalizedEnd,
  };
}
