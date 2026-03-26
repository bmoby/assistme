import { google } from 'googleapis';
import { logger } from '../logger.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function getAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth2 credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

interface MeetEventResult {
  meetUrl: string;
  eventId: string;
}

/**
 * Creates a Google Calendar event with an auto-generated Google Meet link.
 */
export async function createMeetEvent(
  title: string,
  startTime: string,
  durationMinutes = 120
): Promise<MeetEventResult> {
  // Dev/test: return a fictitious link when Google credentials are not configured
  const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;
  if (!hasGoogleCreds) {
    const fakeId = `dev-${Date.now()}`;
    const fakeUrl = `https://meet.google.com/dev-fake-${fakeId.slice(-8)}`;
    logger.info({ meetUrl: fakeUrl, title }, 'Google Meet credentials not set — returning fictitious link');
    return { meetUrl: fakeUrl, eventId: fakeId };
  }

  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `session-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  const meetUrl = event.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri;

  if (!meetUrl || !event.data.id) {
    throw new Error('Failed to generate Google Meet link');
  }

  logger.info({ meetUrl, eventId: event.data.id, title }, 'Google Meet event created');

  return { meetUrl, eventId: event.data.id };
}

/**
 * Returns the OAuth2 authorization URL for the initial setup.
 * Used by scripts/google-auth.ts.
 */
export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchanges an authorization code for tokens.
 * Used by scripts/google-auth.ts.
 */
export async function exchangeCode(code: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. Make sure to set prompt=consent.');
  }

  return tokens.refresh_token;
}
