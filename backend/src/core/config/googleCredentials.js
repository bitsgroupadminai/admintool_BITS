import fs from 'fs';
import path from 'path';
import { env } from './env.js';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

export function isGoogleOAuthConfigured() {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN,
  );
}

export function resolveServiceAccountCredentials() {
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    return null;
  }

  const filePath = path.isAbsolute(env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
    ? env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
    : path.resolve(process.cwd(), env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed.client_email || !parsed.private_key) {
    return null;
  }

  return {
    email: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

export function isGoogleServiceAccountConfigured() {
  const account = resolveServiceAccountCredentials();
  return Boolean(account?.email && account?.privateKey && env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL);
}

export function isGoogleMeetConfigured() {
  return isGoogleOAuthConfigured() || isGoogleServiceAccountConfigured();
}

export function getGoogleCalendarAuthMode() {
  if (isGoogleOAuthConfigured()) return 'oauth';
  if (isGoogleServiceAccountConfigured()) return 'service_account';
  return null;
}
