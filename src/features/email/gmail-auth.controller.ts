import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGmailOAuth2Client } from '../../config/gmail.config';

@Controller('auth/gmail')
export class GmailAuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('auth')
  auth() {
    const oauth2Client = createGmailOAuth2Client(this.configService);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent', // Force consent to get refresh token
    });
    return { url };
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    if (!code) {
      return { error: 'No authorization code provided' };
    }

    const oauth2Client = createGmailOAuth2Client(this.configService);
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n=== GMAIL TOKENS - SAVE THESE SECURELY ===');
      console.log('EMAIL_GMAIL_ACCESS_TOKEN=', tokens.access_token);
      console.log('EMAIL_GMAIL_REFRESH_TOKEN=', tokens.refresh_token);
      console.log('EMAIL_GMAIL_EXPIRY_DATE=', tokens.expiry_date);
      console.log('===========================================\n');
      
      return {
        success: true,
        message: 'Tokens received. Store them securely in your .env file.',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return {
        success: false,
        error: error.message || 'Failed to get tokens',
      };
    }
  }
}

