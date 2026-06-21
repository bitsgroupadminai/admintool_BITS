import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   country?: string;
 *   label: string;
 *   iconComponent?: React.ElementType;
 * }} props
 */
function CountryFlag({ country, label, iconComponent: Icon }) {
  if (!Icon) {
    return null;
  }

  return <Icon aria-hidden country={country} label={label} />;
}

/**
 * Searchable country picker for react-phone-number-input.
 * Uses SVG flags via the library's iconComponent (works on Windows).
 *
 * @param {{
 *   value?: string;
 *   onChange: (value?: string) => void;
 *   options: Array<{ value?: string; label: string; divider?: boolean }>;
 *   disabled?: boolean;
 *   readOnly?: boolean;
 *   iconComponent?: React.ElementType;
 * }} props
 */
export function SearchableCountrySelect({
  value,
  onChange,
  options,
  disabled = false,
  readOnly = false,
  iconComponent,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const isDisabled = disabled || readOnly;

  const selectableOptions = useMemo(
    () => options.filter((option) => !option.divider),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return selectableOptions;
    }

    return selectableOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [query, selectableOptions]);

  const selectedOption = selectableOptions.find((option) => option.value === value);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  const selectCountry = (countryCode) => {
    onChange(countryCode || undefined);
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

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  return (
    <div ref={rootRef} className="PhoneInputCountry phone-country-select">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          'phone-country-select__trigger',
          open && 'phone-country-select__trigger--open',
          isDisabled && 'phone-country-select__trigger--disabled',
        )}
      >
        <CountryFlag
          iconComponent={iconComponent}
          country={value}
          label={selectedOption?.label ?? 'International'}
        />
        <ChevronDown
          className={cn('phone-country-select__chevron', open && 'phone-country-select__chevron--open')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="phone-country-select__menu">
          <div className="phone-country-select__search-wrap">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search country"
              className="phone-country-select__search"
              aria-label="Search country"
            />
          </div>

          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={id}
            className="phone-country-select__list"
          >
            {filteredOptions.length === 0 ? (
              <li className="phone-country-select__empty">No country found</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                return (
                  <li
                    key={option.value || 'intl'}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCountry(option.value)}
                    className={cn(
                      'phone-country-select__option',
                      isSelected && 'phone-country-select__option--selected',
                      isActive && 'phone-country-select__option--active',
                    )}
                  >
                    <CountryFlag
                      iconComponent={iconComponent}
                      country={option.value}
                      label={option.label}
                    />
                    <span className="phone-country-select__option-label">{option.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      <span className="sr-only">
        {selectedOption?.label ?? 'International'}
      </span>
    </div>
  );
}
