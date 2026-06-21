import { parsePhoneNumberFromString, isValidPhoneNumber, isPossiblePhoneNumber } from 'libphonenumber-js';

/** E.164 allows at most 15 digits (excluding the leading +). */
export const E164_MAX_DIGITS = 15;

function countPhoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '').length;
}

/**
 * @param {string} value
 */
export function validatePhoneNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { valid: false, error: 'Mobile number is required' };
  }

  if (!raw.startsWith('+')) {
    return { valid: false, error: 'Country code is required' };
  }

  if (countPhoneDigits(raw) > E164_MAX_DIGITS) {
    return { valid: false, error: 'Mobile number is too long' };
  }

  if (!isPossiblePhoneNumber(raw)) {
    return { valid: false, error: 'Mobile number is too long for the selected country' };
  }

  if (!isValidPhoneNumber(raw)) {
    return { valid: false, error: 'Enter a valid mobile number with country code' };
  }

  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed) {
    return { valid: false, error: 'Enter a valid mobile number with country code' };
  }

  return {
    valid: true,
    value: parsed.format('E.164'),
    countryCode: `+${parsed.countryCallingCode}`,
    nationalNumber: parsed.nationalNumber,
  };
}

/**
 * @param {string} value
 */
export function normalizeMobileNumber(value) {
  return validatePhoneNumber(value);
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
