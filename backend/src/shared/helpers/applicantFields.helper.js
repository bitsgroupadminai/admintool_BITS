import { APPLICANT_FIELD_TYPE } from '../enums/offering.enums.js';
import { validatePhoneNumber } from './phone.helper.js';

export const MIN_APPLICANT_AGE_YEARS = 15;
export const MIN_APPLICANT_AGE_ERROR =
  'You must be at least 15 years old to apply for this course.';

/**
 * @param {{ fieldType?: string, fieldKey?: string, label?: string }} field
 */
export function isDateOfBirthField(field) {
  if (!field || field.fieldType !== APPLICANT_FIELD_TYPE.DATE) return false;

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
export function getDateOfBirthAgeError(field, value, now = new Date()) {
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
 * @param {string} label
 */
export function slugifyApplicantFieldKey(label) {
  const slug = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || `field_${Date.now()}`;
}

/**
 * @param {Array<{ fieldKey: string, label: string, fieldType: string, required?: boolean, options?: string[] }>} fields
 * @param {Record<string, unknown>} rawDetails
 */
export function validateApplicantDetails(fields = [], rawDetails = {}) {
  const errors = [];
  const details = [];

  for (const field of fields) {
    const rawValue = rawDetails[field.fieldKey];
    const stringValue =
      rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
    const isEmpty = stringValue === '';

    if (field.required && isEmpty) {
      errors.push(`${field.label} is required`);
      continue;
    }

    if (isEmpty) continue;

    if (field.fieldType === APPLICANT_FIELD_TYPE.EMAIL) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
        errors.push(`${field.label} must be a valid email`);
        continue;
      }
    }

    if (field.fieldType === APPLICANT_FIELD_TYPE.DATE) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        errors.push(`${field.label} must be a valid date`);
        continue;
      }

      const ageError = getDateOfBirthAgeError(field, stringValue);
      if (ageError) {
        errors.push(ageError);
        continue;
      }
    }

    if (field.fieldType === APPLICANT_FIELD_TYPE.NUMBER) {
      if (Number.isNaN(Number(stringValue))) {
        errors.push(`${field.label} must be a number`);
        continue;
      }
    }

    if (field.fieldType === APPLICANT_FIELD_TYPE.SELECT) {
      const options = (field.options ?? []).map((item) => String(item));
      if (options.length > 0 && !options.includes(stringValue)) {
        errors.push(`${field.label} has an invalid option`);
        continue;
      }
    }

    if (field.fieldType === APPLICANT_FIELD_TYPE.PHONE) {
      const phoneResult = validatePhoneNumber(stringValue);
      if (!phoneResult.valid) {
        errors.push(`${field.label}: ${phoneResult.error}`);
        continue;
      }
      details.push({
        fieldKey: field.fieldKey,
        label: field.label,
        value: phoneResult.value,
      });
      continue;
    }

    details.push({
      fieldKey: field.fieldKey,
      label: field.label,
      value:
        field.fieldType === APPLICANT_FIELD_TYPE.NUMBER
          ? Number(stringValue)
          : stringValue,
    });
  }

  return { details, errors };
}

/**
 * @param {Array<{ fieldKey: string, label: string }>} fields
 */
export function ensureUniqueApplicantFieldKeys(fields = []) {
  const seen = new Set();
  return fields.map((field, index) => {
    let fieldKey = field.fieldKey?.trim() || slugifyApplicantFieldKey(field.label);
    const baseKey = fieldKey;
    let counter = 2;

    while (seen.has(fieldKey)) {
      fieldKey = `${baseKey}_${counter}`;
      counter += 1;
    }

    seen.add(fieldKey);
    return {
      ...field,
      fieldKey,
      order: index + 1,
    };
  });
}
