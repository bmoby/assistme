/**
 * One-time script to obtain a Google OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Create a Google Cloud project at https://console.cloud.google.com
 *   2. Enable the Google Calendar API
 *   3. Create OAuth2 credentials (Desktop App)
 *   4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env
 *
 * Usage:
 *   pnpm tsx scripts/google-auth.ts
 *
 * The script will:
 *   1. Print an authorization URL — open it in your browser
 *   2. After granting access, Google gives you a code
 *   3. Paste the code here — the script prints your GOOGLE_REFRESH_TOKEN
 *   4. Add the refresh token to your .env file
 */
import 'dotenv/config';
import * as readline from 'readline';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/oauth2callback'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n=== Google OAuth2 Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Grant access to your Google account.');
  console.log('3. You will be redirected to a URL like:');
  console.log('   http://localhost:3000/oauth2callback?code=XXXX');
  console.log('4. Copy the "code" parameter value and paste it below.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('Paste the authorization code: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('\nNo refresh token received.');
      console.error('Make sure you revoked previous access at https://myaccount.google.com/permissions');
      console.error('Then run this script again.');
      process.exit(1);
    }

    console.log('\n=== Success! ===\n');
    console.log('Add this to your .env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nDone! You can now use the Google Meet integration.');
  } catch (error) {
    console.error('\nFailed to exchange code for tokens:', error);
    process.exit(1);
  }
}

main();
