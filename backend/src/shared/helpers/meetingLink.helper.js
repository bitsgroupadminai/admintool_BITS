import { AppError } from '../../core/utils/AppError.js';
import { MEETING_PROVIDER } from '../enums/operations.enums.js';
import { createGoogleMeetEvent, isGoogleMeetConfigured } from '../services/googleMeet.service.js';

/**
 * @param {string | null | undefined} link
 */
export function isValidMeetingUrl(link) {
  if (!link || typeof link !== 'string') return false;
  try {
    const url = new URL(link.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Real Google Meet via Google Calendar API.
 * Zoom is not implemented — use staff UI "Coming soon" only.
 *
 * @param {string} provider
 * @param {{
 *   summary: string,
 *   description?: string,
 *   slotStart: Date,
 *   slotEnd: Date,
 * }} context
 */
export async function generateMeetingLink(provider, context) {
  if (provider === MEETING_PROVIDER.ZOOM) {
    throw new AppError('Zoom integration is coming soon. Please use Google Meet.', 501);
  }

  if (provider === MEETING_PROVIDER.GOOGLE_MEET) {
    if (!isGoogleMeetConfigured()) {
      throw new AppError(
        'Google Meet is not configured on the server. Set GOOGLE_OAUTH_* in backend .env (personal Gmail) or service account settings (Google Workspace).',
        503,
      );
    }
    return createGoogleMeetEvent({
      summary: context.summary,
      description: context.description,
      slotStart: context.slotStart,
      slotEnd: context.slotEnd,
    });
  }

  return null;
}

export { isGoogleMeetConfigured };
