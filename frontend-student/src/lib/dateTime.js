const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value, locale = 'en-IN') {
  const date = parseIsoDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMonthLabel(date, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatMonthName(date, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
}

export const MONTH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function buildYearOptions(now = new Date(), pastYears = 120, futureYears = 10) {
  const latest = now.getFullYear() + futureYears;
  const earliest = now.getFullYear() - pastYears;
  const years = [];
  for (let year = latest; year >= earliest; year -= 1) {
    years.push(year);
  }
  return years;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayIndex = index - startOffset + 1;
    let cellDate;

    if (dayIndex < 1) {
      cellDate = new Date(year, month - 1, daysInPrevMonth + dayIndex);
    } else if (dayIndex > daysInMonth) {
      cellDate = new Date(year, month + 1, dayIndex - daysInMonth);
    } else {
      cellDate = new Date(year, month, dayIndex);
    }

    cells.push({
      date: cellDate,
      iso: toIsoDate(cellDate),
      inCurrentMonth: cellDate.getMonth() === month,
    });
  }

  return cells;
}

export { WEEKDAY_LABELS };
