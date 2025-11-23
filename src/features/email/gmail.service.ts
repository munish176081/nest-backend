import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { createGmailOAuth2Client } from '../../config/gmail.config';
import { EmailSendResult } from './postmark-client';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client;

  constructor(private readonly configService: ConfigService) {
    this.oauth2Client = createGmailOAuth2Client(this.configService);

    // Load stored tokens from environment
    const accessToken = this.configService.get<string>('gmail.accessToken') || 
                       process.env.EMAIL_GMAIL_ACCESS_TOKEN;
    const refreshToken = this.configService.get<string>('gmail.refreshToken') || 
                        process.env.EMAIL_GMAIL_REFRESH_TOKEN;
    const expiryDate = this.configService.get<number>('gmail.expiryDate') || 
                       process.env.EMAIL_GMAIL_EXPIRY_DATE;

    if (refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate ? parseInt(expiryDate.toString(), 10) : undefined,
      });
      this.logger.log('Gmail OAuth credentials loaded successfully.');
    } else {
      this.logger.warn(
        'Gmail refresh token not configured. Email sending will fail. ' +
        'Visit /api/v1/auth/gmail/auth to obtain tokens and add EMAIL_GMAIL_REFRESH_TOKEN to your .env file.',
      );
    }
  }

  /**
   * Checks if Gmail credentials are configured
   */
  private hasCredentials(): boolean {
    const credentials = this.oauth2Client.credentials;
    return !!(credentials?.refresh_token || credentials?.access_token);
  }

  /**
   * Ensures the access token is valid, refreshing if necessary
   */
  private async ensureValidToken() {
    // Check if credentials exist at all
    if (!this.hasCredentials()) {
      throw new Error(
        'Gmail OAuth credentials not configured. Please visit /api/v1/auth/gmail/auth to obtain tokens and add EMAIL_GMAIL_REFRESH_TOKEN to your .env file.',
      );
    }

    try {
      // Check if token is expired or about to expire (within 5 minutes)
      const expiryDate = this.oauth2Client.credentials.expiry_date;
      if (expiryDate && expiryDate < Date.now() + 5 * 60 * 1000) {
        this.logger.log('Access token expired or expiring soon, refreshing...');
        const newTokens = await this.oauth2Client.getAccessToken();
        if (newTokens.token) {
          this.oauth2Client.setCredentials({
            ...this.oauth2Client.credentials,
            access_token: newTokens.token,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh Gmail access token. Please re-authenticate.');
    }
  }

  /**
   * Gets the authenticated user's email address
   */
  private async getUserEmail(): Promise<string> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return profile.data.emailAddress || '';
    } catch (error) {
      this.logger.warn('Failed to get user email from Gmail profile, using fallback');
      return '';
    }
  }

  /**
   * Sends an email using Gmail API
   * @param to Recipient email address
   * @param subject Email subject
   * @param html HTML content of the email
   * @param from Optional sender email (defaults to authenticated Gmail account)
   */
  async sendMail(
    to: string,
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult> {
    try {
      await this.ensureValidToken();

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get sender email address
      let senderEmail = from;
      if (!senderEmail) {
        senderEmail = await this.getUserEmail();
      }

      // Extract email address if it already contains a display name (e.g., "admin <email@example.com>")
      const emailMatch = senderEmail?.match(/<(.+)>/);
      const emailAddress = emailMatch ? emailMatch[1] : senderEmail;

      // Get from name from configuration (defaults to 'pups4sale' if not configured)
      const fromName = this.configService.get<string>('gmail.fromName') || 'pups4sale';

      // Format From header with configurable display name
      const fromHeader = emailAddress ? `${fromName} <${emailAddress}>` : fromName;

      // Build email message
      const messageParts = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        html,
      ];

      const message = messageParts.join('\n');

      // Encode message in base64url format (RFC 4648)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      this.logger.log(`Email sent successfully to ${to} via Gmail API`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.code || error?.status || 500;

      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`, error?.stack);

      // Handle specific Gmail API errors
      if (error?.code === 401 || error?.message?.includes('Invalid Credentials')) {
        return {
          success: false,
          error: 'Gmail authentication failed. Please re-authenticate.',
          errorCode: 401,
        };
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }
}

