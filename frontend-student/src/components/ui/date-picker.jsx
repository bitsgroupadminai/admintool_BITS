import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WEEKDAY_LABELS,
  buildCalendarDays,
  formatDisplayDate,
  formatMonthLabel,
  isSameDay,
  parseIsoDate,
  toIsoDate,
} from '@/lib/dateTime';

const triggerSizes = {
  default: 'h-11 px-4 text-sm',
  compact: 'h-10 px-3 text-xs',
};

/**
 * @param {{
 *   value?: string;
 *   onChange: (value: string) => void;
 *   placeholder?: string;
 *   label?: string;
 *   disabled?: boolean;
 *   id?: string;
 *   className?: string;
 *   size?: 'default' | 'compact';
 *   required?: boolean;
 *   'aria-label'?: string;
 * }} props
 */
export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Select date',
  label,
  disabled = false,
  id: idProp,
  className,
  size = 'default',
  required = false,
  'aria-label': ariaLabel,
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(value);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectDate = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#052E1C]">
          {label}
          {required ? <span className="text-[#B91C1C]"> *</span> : null}
        </label>
      ) : null}

      <div ref={rootRef} className="relative w-full">
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => !disabled && setOpen((current) => !current)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] text-left text-[#052E1C] outline-none transition',
            'hover:border-[#6EE7B7] hover:bg-[#EDFAF3]',
            'focus-visible:border-[#0A6640] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#6EE7B7]/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open && 'border-[#0A6640] bg-white ring-2 ring-[#6EE7B7]/25',
            triggerSizes[size],
          )}
        >
          <span className={cn('min-w-0 truncate', !value && 'text-[#4B6358]')}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
          <CalendarDays
            className={cn('h-4 w-4 shrink-0 text-[#0A6640]', size === 'compact' && 'h-3.5 w-3.5')}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Choose date"
            className="absolute left-0 right-0 z-[60] mt-1.5 min-w-[280px] overflow-hidden rounded-xl border border-[#C4E8D4] bg-white shadow-[0_12px_32px_rgba(5,46,28,0.14)]"
          >
            <div className="flex items-center justify-between border-b border-[#E2EEE8] px-3 py-2.5">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B6358] transition hover:bg-[#F0FAF5] hover:text-[#0A6640]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[#052E1C]">{formatMonthLabel(viewDate)}</p>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B6358] transition hover:bg-[#F0FAF5] hover:text-[#0A6640]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#10B981]">
              {WEEKDAY_LABELS.map((dayLabel) => (
                <span key={dayLabel} className="py-1">
                  {dayLabel}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 p-3 pt-1">
              {cells.map((cell) => {
                const isSelected = value === cell.iso;
                const isToday = isSameDay(cell.date, today);

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => selectDate(cell.iso)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-sm transition',
                      !cell.inCurrentMonth && 'text-[#A8BDB5]',
                      cell.inCurrentMonth && 'text-[#052E1C] hover:bg-[#F0FAF5]',
                      isToday && !isSelected && 'ring-1 ring-[#6EE7B7]',
                      isSelected && 'bg-[#0A6640] font-semibold text-white hover:bg-[#084F31]',
                    )}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-[#E2EEE8] px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#4B6358] transition hover:bg-[#F0FAF5]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => selectDate(toIsoDate(today))}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5]"
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
