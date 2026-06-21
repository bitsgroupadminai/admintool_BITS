import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
const redirectUri =
  process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? 'http://127.0.0.1:8765/oauth2callback';

if (!clientId || !clientSecret || !refreshToken) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REFRESH_TOKEN.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oauth2Client.setCredentials({ refresh_token: refreshToken });

try {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  await calendar.calendarList.list({ maxResults: 1 });
  console.log('Google Calendar OAuth is working.');
} catch (err) {
  const message = err?.message ?? 'Unknown error';
  console.error('Google Calendar OAuth failed:', message);
  if (message.includes('unauthorized_client')) {
    console.error('');
    console.error('The refresh token does not belong to this OAuth client.');
    console.error('Fix: create a Desktop OAuth client in GCP, update .env, then run:');
    console.error('  npm run google:oauth-setup');
  }
  process.exit(1);
}
