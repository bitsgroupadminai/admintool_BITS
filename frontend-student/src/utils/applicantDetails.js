import { parsePhoneValue, isPhoneValueComplete } from '@/utils/phone';

export const MIN_APPLICANT_AGE_YEARS = 15;
export const MIN_APPLICANT_AGE_ERROR =
  'You must be at least 15 years old to apply for this course.';

/**
 * @param {{ fieldType?: string, fieldKey?: string, label?: string }} field
 */
export function isDateOfBirthField(field) {
  if (!field || field.fieldType !== 'date') return false;

  const key = String(field.fieldKey ?? '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const label = String(field.label ?? '').toLowerCase();

  return (
    key.includes('date_of_birth') ||
    key === 'dob' ||
    key.includes('birth_date') ||
    key.includes('birthdate') ||
    label.includes('date of birth') ||
    label.includes('birth date') ||
    /\bdob\b/.test(label)
  );
}

/**
 * @param {string} iso YYYY-MM-DD
 * @param {Date} [now]
 * @returns {number | null}
 */
export function ageFromIsoDate(iso, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = now.getFullYear() - year;
  const monthNow = now.getMonth() + 1;
  const dayNow = now.getDate();
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age -= 1;
  }

  return age;
}

/**
 * @param {{ fieldType?: string, fieldKey?: string, label?: string }} field
 * @param {unknown} value
 * @param {Date} [now]
 */
export function getDateOfBirthError(field, value, now = new Date()) {
  if (!isDateOfBirthField(field)) return null;

  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;

  const age = ageFromIsoDate(trimmed, now);
  if (age === null || age < MIN_APPLICANT_AGE_YEARS) {
    return MIN_APPLICANT_AGE_ERROR;
  }

  return null;
}

/**
 * @param {{ applicantFields?: Array<any> } | null} offering
 * @param {Record<string, unknown>} values
 */
export function getApplicantDetailsAgeError(offering, values = {}) {
  for (const field of offering?.applicantFields ?? []) {
    const error = getDateOfBirthError(field, values[field.fieldKey]);
    if (error) return error;
  }
  return null;
}

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
  return (
    getMissingApplicantFields(offering, values).length === 0 &&
    !getApplicantDetailsAgeError(offering, values)
  );
}
