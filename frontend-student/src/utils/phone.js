import { parsePhoneNumberFromString, isValidPhoneNumber, isPossiblePhoneNumber } from 'libphonenumber-js';

/** E.164 allows at most 15 digits (excluding the leading +). */
export const E164_MAX_DIGITS = 15;

export function countPhoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '').length;
}

/**
 * Block input once E.164 max length is reached; keep the previous value instead of clearing.
 * @param {string | undefined} value
 * @param {string | undefined} previousValue
 */
export function clampPhoneInputValue(value, previousValue = '') {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (countPhoneDigits(raw) > E164_MAX_DIGITS) {
    return String(previousValue ?? '').trim();
  }

  return raw;
}

export function createEmptyPhoneValue() {
  return '';
}

/**
 * @param {string} value
 */
export function validatePhoneInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { valid: false, error: 'Mobile number is required' };
  }

  if (!raw.startsWith('+')) {
    return { valid: false, error: 'Select a country code' };
  }

  if (countPhoneDigits(raw) > E164_MAX_DIGITS) {
    return { valid: false, error: 'Mobile number is too long' };
  }

  if (!isPossiblePhoneNumber(raw)) {
    return { valid: false, error: 'Mobile number is too long for the selected country' };
  }

  if (!isValidPhoneNumber(raw)) {
    return { valid: false, error: 'Enter a valid mobile number' };
  }

  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed) {
    return { valid: false, error: 'Enter a valid mobile number' };
  }

  return {
    valid: true,
    e164: parsed.format('E.164'),
    countryCode: `+${parsed.countryCallingCode}`,
    nationalNumber: parsed.nationalNumber,
  };
}

/**
 * @param {string} value
 */
export function isPhoneValueComplete(value) {
  return validatePhoneInput(value).valid;
}

/**
 * @param {string} value
 */
export function serializePhoneValue(value) {
  const result = validatePhoneInput(value);
  return result.valid ? result.e164 : '';
}

/**
 * @param {string} value
 */
export function formatPhoneForDisplay(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '—';
  }

  try {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed) {
      return parsed.formatInternational();
    }
  } catch {
    // fall through
  }

  return raw;
}

/**
 * @param {string | { countryCode?: string; nationalNumber?: string } | null | undefined} value
 */
export function parsePhoneValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const countryCode = value.countryCode ?? '';
    const nationalNumber = String(value.nationalNumber ?? '').replace(/\D/g, '');
    if (countryCode && nationalNumber) {
      return `${countryCode}${nationalNumber}`;
    }
  }

  return '';
}

/**
 * @param {Array<any>} fields
 * @param {Record<string, unknown>} values
 */
export function serializeApplicantDetailsForSubmit(fields = [], values = {}) {
  const result = {};

  for (const field of fields) {
    const raw = values[field.fieldKey];
    if (field.fieldType === 'phone') {
      result[field.fieldKey] = serializePhoneValue(parsePhoneValue(raw));
      continue;
    }

    result[field.fieldKey] = raw;
  }

  return result;
}

/**
 * @param {Array<any>} fields
 * @param {Record<string, unknown>} values
 */
export function validateApplicantPhoneFields(fields = [], values = {}) {
  for (const field of fields) {
    if (field.fieldType !== 'phone') continue;
    if (field.required === false && !values[field.fieldKey]) continue;

    const result = validatePhoneInput(parsePhoneValue(values[field.fieldKey]));
    if (!result.valid) {
      return `${field.label}: ${result.error}`;
    }
  }

  return null;
}
