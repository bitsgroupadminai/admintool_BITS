import PhoneInputWithCountry from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en';
import 'react-phone-number-input/style.css';
import './phone-input.css';
import { SearchableCountrySelect } from '@/components/ui/SearchableCountrySelect';
import { parsePhoneValue, clampPhoneInputValue } from '@/utils/phone';

/**
 * Searchable international phone input backed by libphonenumber-js
 * (via react-phone-number-input). Value is always E.164, e.g. +919876543210.
 *
 * @param {{
 *   id?: string;
 *   value?: string | { countryCode?: string; nationalNumber?: string };
 *   onChange: (value: string) => void;
 *   required?: boolean;
 *   placeholder?: string;
 *   className?: string;
 *   defaultCountry?: string;
 * }} props
 */
export function PhoneInput({
  id,
  value,
  onChange,
  required = true,
  placeholder = 'Mobile number',
  className,
  defaultCountry = 'IN',
}) {
  const e164Value = parsePhoneValue(value) || undefined;
  const normalizedDefaultCountry = String(defaultCountry ?? 'IN').toUpperCase();

  return (
    <div className={`phone-input-root ${className ?? ''}`}>
      <PhoneInputWithCountry
        id={id}
        name={id}
        labels={en}
        flags={flags}
        international
        countryCallingCodeEditable={false}
        defaultCountry={normalizedDefaultCountry}
        countrySelectComponent={SearchableCountrySelect}
        limitMaxLength
        value={e164Value}
        onChange={(nextValue) => onChange(clampPhoneInputValue(nextValue, e164Value))}
        placeholder={placeholder}
        required={required}
        autoComplete="tel"
      />
    </div>
  );
}
