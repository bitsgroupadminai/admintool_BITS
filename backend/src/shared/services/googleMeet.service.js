import crypto from 'crypto';
import { google } from 'googleapis';
import { env } from '../../core/config/env.js';
import {
  GOOGLE_CALENDAR_SCOPE,
  getGoogleCalendarAuthMode,
  isGoogleMeetConfigured,
  isGoogleOAuthConfigured,
  isGoogleServiceAccountConfigured,
  resolveServiceAccountCredentials,
} from '../../core/config/googleCredentials.js';
import { AppError } from '../../core/utils/AppError.js';
import { logger } from '../../core/logger/index.js';
import { MEETING_PROVIDER } from '../enums/operations.enums.js';

export { isGoogleMeetConfigured };

/**
 * Extract Meet room code from URL e.g. https://meet.google.com/abc-defg-hij
 * @param {string | null | undefined} url
 */
export function extractMeetCodeFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment ?? null;
  } catch {
    return null;
  }
}

function getGoogleMeetConfigError() {
  if (isGoogleOAuthConfigured() || isGoogleServiceAccountConfigured()) {
    return null;
  }

  return new AppError(
    'Google Meet is not configured. For personal Gmail, set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN (run npm run google:oauth-setup). For Google Workspace later, use GOOGLE_SERVICE_ACCOUNT_KEY_FILE plus GOOGLE_CALENDAR_IMPERSONATE_EMAIL.',
    503,
  );
}

function getCalendarClient() {
  const configError = getGoogleMeetConfigError();
  if (configError) {
    throw configError;
  }

  const authMode = getGoogleCalendarAuthMode();

  if (authMode === 'oauth') {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI,
    );
    oauth2Client.setCredentials({ refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  const account = resolveServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: account.email,
    key: account.privateKey,
    scopes: [GOOGLE_CALENDAR_SCOPE],
    subject: env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL,
  });

  return google.calendar({ version: 'v3', auth });
}

function mapGoogleMeetError(err) {
  const message = err?.message ?? '';
  if (message.includes('unauthorized_client')) {
    return new AppError(
      'Google Calendar OAuth failed. Re-run `npm run google:oauth-setup` and ensure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, and GOOGLE_OAUTH_REFRESH_TOKEN all come from the same OAuth Web client.',
      502,
    );
  }

  return new AppError(
    message || 'Could not create Google Meet link. Verify Calendar API access and OAuth credentials.',
    502,
  );
}

/**
 * Create a real Google Calendar event with a Google Meet conference link.
 * Uses OAuth for personal Gmail, or service-account delegation for Google Workspace.
 *
 * @param {{
 *   summary: string,
 *   description?: string,
 *   slotStart: Date,
 *   slotEnd: Date,
 *   timeZone?: string,
 * }} params
 */
export async function createGoogleMeetEvent({
  summary,
  description = '',
  slotStart,
  slotEnd,
  timeZone = env.GOOGLE_CALENDAR_TIMEZONE ?? 'Asia/Kolkata',
}) {
  const calendar = getCalendarClient();
  const calendarId = env.GOOGLE_CALENDAR_ID ?? 'primary';
  const requestId = crypto.randomUUID();

  try {
    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'none',
      requestBody: {
        summary,
        description,
        start: {
          dateTime: slotStart.toISOString(),
          timeZone,
        },
        end: {
          dateTime: slotEnd.toISOString(),
          timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const event = response.data;
    const videoEntry = event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === 'video',
    );
    const meetLink = event.hangoutLink ?? videoEntry?.uri ?? null;

    if (!meetLink) {
      logger.error({ eventId: event.id }, 'Google Calendar event created without Meet link');
      throw new AppError('Google Meet link was not returned. Check Calendar and Meet settings.', 502);
    }

    const meetingCode =
      event.conferenceData?.conferenceId ??
      extractMeetCodeFromUrl(meetLink);

    return {
      provider: MEETING_PROVIDER.GOOGLE_MEET,
      link: meetLink,
      meetingId: meetingCode,
      calendarEventId: event.id,
      passcode: videoEntry?.passcode ?? null,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err }, 'Failed to create Google Meet event');
    throw mapGoogleMeetError(err);
  }
}

/**
 * @param {string} calendarEventId
 */
export async function deleteGoogleMeetEvent(calendarEventId) {
  if (!calendarEventId || !isGoogleMeetConfigured()) return;

  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: env.GOOGLE_CALENDAR_ID ?? 'primary',
      eventId: calendarEventId,
    });
  } catch (err) {
    logger.warn({ err, calendarEventId }, 'Could not delete Google Calendar event');
  }
}
