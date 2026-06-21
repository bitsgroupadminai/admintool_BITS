import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const triggerSizes = {
  default: 'h-10 px-3 text-sm',
  sm: 'h-9 px-3 text-xs',
};

const optionSizes = {
  default: 'px-3 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

/**
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   options: Array<{ value: string; label: string; disabled?: boolean }>;
 *   placeholder?: string;
 *   disabled?: boolean;
 *   id?: string;
 *   className?: string;
 *   size?: 'default' | 'sm';
 *   'aria-label'?: string;
 * }} props
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id: idProp,
  className,
  size = 'default',
  'aria-label': ariaLabel,
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const safeOptions = options ?? [];
  const selectableOptions = placeholder
    ? [{ value: '', label: placeholder, disabled: false }, ...safeOptions]
    : safeOptions;

  const enabledOptions = selectableOptions.filter((option) => !option.disabled);
  const selectedOption = selectableOptions.find((option) => option.value === value);
  const displayLabel = selectedOption?.label ?? placeholder ?? 'Select…';

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectValue = (nextValue) => {
    onChange(nextValue);
    close();
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        close();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const moveActive = (direction) => {
    if (enabledOptions.length === 0) return;

    setActiveIndex((current) => {
      const currentEnabledIndex = enabledOptions.findIndex(
        (option) => option.value === selectableOptions[current]?.value,
      );
      const baseIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : -1;
      const nextIndex =
        direction === 'down'
          ? (baseIndex + 1) % enabledOptions.length
          : (baseIndex - 1 + enabledOptions.length) % enabledOptions.length;
      return selectableOptions.findIndex((option) => option.value === enabledOptions[nextIndex].value);
    });
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        const selectedIndex = selectableOptions.findIndex((option) => option.value === value);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }
      moveActive(event.key === 'ArrowDown' ? 'down' : 'up');
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        const selectedIndex = selectableOptions.findIndex((option) => option.value === value);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }
      if (activeIndex >= 0 && !selectableOptions[activeIndex]?.disabled) {
        selectValue(selectableOptions[activeIndex].value);
      }
      return;
    }

    if (event.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => {
            const next = !current;
            if (next) {
              const selectedIndex = selectableOptions.findIndex((option) => option.value === value);
              setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
            } else {
              setActiveIndex(-1);
            }
            return next;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] text-left text-[#052E1C] transition-all duration-200',
          'hover:border-[#6EE7B7] hover:bg-[#EDFAF3] focus-visible:outline-none focus-visible:border-[#6EE7B7] focus-visible:ring-2 focus-visible:ring-[#6EE7B7]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-[#6EE7B7] bg-white ring-2 ring-[#6EE7B7]/20',
          triggerSizes[size],
        )}
      >
        <span className={cn('min-w-0 truncate', !selectedOption && placeholder && 'text-[#A8BDB5]')}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#4B6358] transition-transform duration-200',
            open && 'rotate-180 text-[#0A6640]',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#C4E8D4] bg-white py-1 shadow-[0_12px_32px_rgba(10,102,64,0.12)]"
        >
          {selectableOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                onClick={() => {
                  if (option.disabled) return;
                  selectValue(option.value);
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 text-[#052E1C] transition-colors',
                  optionSizes[size],
                  isSelected && 'bg-[#F0FAF5] font-semibold text-[#0A6640]',
                  !isSelected && isActive && 'bg-[#F9FCFB]',
                  !isSelected && !isActive && 'hover:bg-[#F0FAF5]',
                  option.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#0A6640]" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
