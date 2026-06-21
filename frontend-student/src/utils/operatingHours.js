export function formatOperatingHoursLabel(value) {
  if (!value) return '—';

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatOperatingHoursRange(start, end) {
  return `${formatOperatingHoursLabel(start)} – ${formatOperatingHoursLabel(end)}`;
}

export function getAppointmentEmptyMessage(slotConfig) {
  if (slotConfig?.hoursIssue === 'invalid_format' || slotConfig?.hoursIssue === 'end_before_start') {
    return 'Appointment hours look misconfigured. Ask your institute to set valid opening and closing times (for example 09:00 to 17:00) in the offering settings.';
  }

  if (slotConfig?.hoursValid === false) {
    return 'Appointment hours need to be corrected in the admin offering settings before slots can appear.';
  }

  return 'No open slots in the next two weeks. All current slots may be full, or today’s office hours may have ended.';
}
