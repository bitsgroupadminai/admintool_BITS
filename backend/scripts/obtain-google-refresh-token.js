import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GOOGLE_CALENDAR_SCOPE } from '../src/core/config/googleCredentials.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? 'http://127.0.0.1:8765/oauth2callback';
const PORT = Number(new URL(REDIRECT_URI).port || 8765);

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in backend/.env first.');
  console.error('');
  console.error('GCP setup (project study-project-500005):');
  console.error('1. APIs & Services > Enable Google Calendar API');
  console.error('2. OAuth consent screen > External > add your Gmail as a test user');
  console.error('3. Add scope: https://www.googleapis.com/auth/calendar');
  console.error('4. Credentials > Create OAuth client ID > Desktop app');
  console.error('5. Copy Client ID and Client secret into backend/.env');
  console.error(`6. Set GOOGLE_OAUTH_REDIRECT_URI=${REDIRECT_URI}`);
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [GOOGLE_CALENDAR_SCOPE],
});

console.log('Sign in with the Gmail account that should host virtual meetings.\n');
console.log(authUrl);
console.log(`\nWaiting for callback on ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const callbackPath = new URL(REDIRECT_URI).pathname;
  if (!req.url?.startsWith(callbackPath)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Authorization failed: ${error}`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing authorization code.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.calendarList.list({ maxResults: 1 });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Success</h1><p>You can close this tab and return to the terminal.</p>');

    if (!tokens.refresh_token) {
      console.warn(
        'No refresh token returned. Revoke prior access at https://myaccount.google.com/permissions and run again.',
      );
    } else {
      console.log('Add these lines to backend/.env (keep quotes on the refresh token):\n');
      console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
      console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
      console.log(`GOOGLE_OAUTH_REDIRECT_URI=${REDIRECT_URI}`);
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log('\nVerify with: npm run google:oauth-verify');
      console.log('Then restart the backend server.');
    }

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Token exchange failed.');
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1');
