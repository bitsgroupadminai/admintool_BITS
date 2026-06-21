import { useMemo } from 'react';
import { Select } from '@/components/ui/select';
import { buildTimeOptions } from '@/lib/dateTime';
import { normalizeOperatingHoursTime } from '@/utils/operatingHours';

function formatTimeLabel(value) {
  const normalized = normalizeOperatingHoursTime(value);
  if (!normalized) return value;

  const [hours, minutes] = normalized.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return normalized;

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function mergeTimeOption(options, value) {
  const normalized = normalizeOperatingHoursTime(value);
  if (!normalized || options.some((option) => option.value === normalized)) {
    return options;
  }

  return [{ value: normalized, label: formatTimeLabel(normalized) }, ...options];
}

/**
 * @param {{
 *   value?: string;
 *   onChange: (value: string) => void;
 *   stepMinutes?: number;
 *   placeholder?: string;
 *   disabled?: boolean;
 *   id?: string;
 *   className?: string;
 *   size?: 'default' | 'sm';
 *   'aria-label'?: string;
 * }} props
 */
export function TimePicker({
  value = '',
  onChange,
  stepMinutes = 30,
  placeholder = 'Select time',
  disabled = false,
  id,
  className,
  size = 'default',
  'aria-label': ariaLabel,
}) {
  const normalizedValue = useMemo(
    () => normalizeOperatingHoursTime(value) ?? '',
    [value],
  );

  const options = useMemo(
    () => mergeTimeOption(buildTimeOptions(stepMinutes), normalizedValue),
    [stepMinutes, normalizedValue],
  );

  return (
    <Select
      id={id}
      value={normalizedValue}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size={size}
      aria-label={ariaLabel}
      options={options}
    />
  );
}
