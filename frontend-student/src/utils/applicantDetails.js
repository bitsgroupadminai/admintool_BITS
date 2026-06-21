import { parsePhoneValue, isPhoneValueComplete } from '@/utils/phone';

export function applicantDetailsToMap(details = []) {
  return Object.fromEntries(
    (details ?? []).map((item) => {
      const fieldKey = item.fieldKey;
      const rawValue = item.value;

      if (typeof rawValue === 'string' && rawValue.startsWith('+')) {
        return [fieldKey, parsePhoneValue(rawValue)];
      }

      return [
        fieldKey,
        rawValue === undefined || rawValue === null ? '' : String(rawValue),
      ];
    }),
  );
}

export function getMissingApplicantFields(offering, values = {}) {
  return (offering?.applicantFields ?? []).filter((field) => {
    if (field.required === false) return false;

    const value = values[field.fieldKey];
    if (field.fieldType === 'phone') {
      return !isPhoneValueComplete(value);
    }

    return value === undefined || value === null || String(value).trim() === '';
  });
}

export function areApplicantDetailsComplete(offering, values = {}) {
  return getMissingApplicantFields(offering, values).length === 0;
}
