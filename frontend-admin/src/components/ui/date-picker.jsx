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
  default: 'h-10 px-3 text-sm',
  sm: 'h-9 px-3 text-xs',
};

/**
 * @param {{
 *   value?: string;
 *   onChange: (value: string) => void;
 *   placeholder?: string;
 *   disabled?: boolean;
 *   id?: string;
 *   className?: string;
 *   size?: 'default' | 'sm';
 *   minDate?: string;
 *   maxDate?: string;
 *   error?: boolean;
 *   'aria-label'?: string;
 * }} props
 */
export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Select date',
  disabled = false,
  id: idProp,
  className,
  size = 'default',
  minDate,
  maxDate,
  error = false,
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

  const isDisabledDate = (iso) => {
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={error || undefined}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border bg-surface text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-destructive/60 ring-2 ring-destructive/10'
            : open
              ? 'border-primary/40 ring-2 ring-primary/10'
              : 'border-border',
          triggerSizes[size],
        )}
      >
        <span className={cn('min-w-0 truncate', !value && 'text-muted')}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarDays
          className={cn('h-4 w-4 shrink-0 text-muted', open && 'text-primary')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 right-0 z-50 mt-1.5 min-w-[280px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_12px_32px_rgba(64,78,59,0.14)]"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-accent/60 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-foreground">{formatMonthLabel(viewDate)}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-accent/60 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-3 pt-1">
            {cells.map((cell) => {
              const isSelected = value === cell.iso;
              const isToday = isSameDay(cell.date, today);
              const isDisabled = isDisabledDate(cell.iso);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && selectDate(cell.iso)}
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-lg text-sm transition',
                    isDisabled && 'cursor-not-allowed opacity-30',
                    !isDisabled && !cell.inCurrentMonth && 'text-muted/50 hover:bg-accent/30',
                    !isDisabled && cell.inCurrentMonth && 'text-foreground hover:bg-accent/50',
                    isToday && !isSelected && !isDisabled && 'ring-1 ring-primary/30',
                    isSelected &&
                      'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:bg-accent/50 hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => selectDate(toIsoDate(today))}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
