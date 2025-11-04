import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

interface GmailCredentials {
  web: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/**
 * Loads Gmail OAuth2 credentials from JSON file or environment variables
 */
function loadGmailCredentials(configService: ConfigService): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  // Try to load from JSON file first (check multiple possible locations)
  const possiblePaths = [
    join(process.cwd(), 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
    join(process.cwd(), 'nest-backend', 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
    join(process.env.HOME || '', 'Downloads', 'client_secret_763573865617_bscvdt95m89ihn8hcih38chm9qh0b7sp_apps.json'),
    process.env.GMAIL_CREDENTIALS_JSON_PATH, // Allow custom path via env var
  ].filter(Boolean) as string[];
  
  for (const jsonPath of possiblePaths) {
    try {
      const jsonContent = readFileSync(jsonPath, 'utf-8');
      const credentials: GmailCredentials = JSON.parse(jsonContent);
      
      if (credentials.web) {
        return {
          clientId: credentials.web.client_id,
          clientSecret: credentials.web.client_secret,
          redirectUri: credentials.web.redirect_uris?.[0] || 'http://localhost:3001/api/v1/auth/gmail/callback',
        };
      }
    } catch (error) {
      // Continue to next path or fall back to env vars
      continue;
    }
  }

  // Fall back to environment variables or config service
  // Never hardcode secrets - always use environment variables
  const clientId = configService.get<string>('gmail.clientId') || process.env.EMAIL_GMAIL_CLIENT_ID;
  const clientSecret = configService.get<string>('gmail.clientSecret') || process.env.EMAIL_GMAIL_CLIENT_SECRET;
  const redirectUri = configService.get<string>('gmail.redirectUri') || process.env.EMAIL_GMAIL_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Gmail OAuth credentials not configured. ' +
      'Please set EMAIL_GMAIL_CLIENT_ID and EMAIL_GMAIL_CLIENT_SECRET in your .env file ' +
      'or provide a Gmail credentials JSON file.',
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export const createGmailOAuth2Client = (configService: ConfigService) => {
  const credentials = loadGmailCredentials(configService);
  
  return new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri,
  );
};
