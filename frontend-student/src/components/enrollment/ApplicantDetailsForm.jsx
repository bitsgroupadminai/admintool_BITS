import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { parsePhoneValue } from '@/utils/phone';

const inputClassName =
  'h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 text-sm text-[#052E1C] outline-none transition focus:border-[#6EE7B7] focus:bg-white';

/**
 * @param {{
 *   fields?: Array<any>;
 *   values: Record<string, string>;
 *   onChange: (fieldKey: string, value: string) => void;
 * }} props
 */
export function ApplicantDetailsForm({ fields = [], values, onChange }) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
        Additional details
      </p>
      {fields.map((field) => (
        <ApplicantFieldInput
          key={field.fieldKey}
          field={field}
          value={values[field.fieldKey] ?? ''}
          onChange={(value) => onChange(field.fieldKey, value)}
        />
      ))}
    </div>
  );
}

function ApplicantFieldInput({ field, value, onChange }) {
  const label = (
    <label htmlFor={field.fieldKey} className="mb-1.5 block text-sm font-medium text-[#052E1C]">
      {field.label}
      {field.required !== false ? <span className="text-[#B91C1C]"> *</span> : null}
    </label>
  );

  if (field.fieldType === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          id={field.fieldKey}
          rows={3}
          value={value}
          required={field.required !== false}
          placeholder={field.placeholder || ''}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClassName} min-h-[96px] py-3`}
        />
        {field.helpText ? <p className="mt-1 text-xs text-[#6B7280]">{field.helpText}</p> : null}
      </div>
    );
  }

  if (field.fieldType === 'select') {
    return (
      <div>
        {label}
        <Select
          id={field.fieldKey}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || 'Choose an option'}
          options={(field.options ?? []).map((option) => ({
            value: option,
            label: option,
          }))}
        />
        {field.helpText ? <p className="mt-1 text-xs text-[#6B7280]">{field.helpText}</p> : null}
      </div>
    );
  }

  if (field.fieldType === 'date') {
    return (
      <div>
        {label}
        <DatePicker
          id={field.fieldKey}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || 'Select date'}
        />
        {field.helpText ? <p className="mt-1 text-xs text-[#6B7280]">{field.helpText}</p> : null}
      </div>
    );
  }

  if (field.fieldType === 'phone') {
    return (
      <div>
        {label}
        <PhoneInput
          id={field.fieldKey}
          value={parsePhoneValue(value)}
          onChange={onChange}
          required={field.required !== false}
          placeholder={field.placeholder || 'Mobile number'}
        />
        {field.helpText ? <p className="mt-1 text-xs text-[#6B7280]">{field.helpText}</p> : null}
      </div>
    );
  }

  const inputType =
    field.fieldType === 'number'
      ? 'number'
      : field.fieldType === 'email'
        ? 'email'
        : 'text';

  return (
    <div>
      {label}
      <input
        id={field.fieldKey}
        type={inputType}
        value={value}
        required={field.required !== false}
        placeholder={field.placeholder || ''}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
      {field.helpText ? <p className="mt-1 text-xs text-[#6B7280]">{field.helpText}</p> : null}
    </div>
  );
}
