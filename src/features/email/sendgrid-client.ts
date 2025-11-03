import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
// for some reason ES6 import is not working
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sgMail = require('@sendgrid/mail');
import { MailDataRequired } from '@sendgrid/mail';

export interface EmailSendResult {
  success: boolean;
  error?: string;
  errorCode?: number;
}

@Injectable()
export class SendGridClient {
  private readonly logger = new Logger(SendGridClient.name);
  
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('email.sendgrid.apiKey')!);
  }

  async send(mail: MailDataRequired): Promise<EmailSendResult> {
    try {
      await sgMail.send(mail);
      this.logger.log(`Email sent successfully to ${mail.to}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.response?.body?.errors?.[0]?.message || error?.message || 'Unknown error';
      const errorCode = error?.response?.statusCode || error?.code || 500;
      
      this.logger.error(`Failed to send email to ${mail.to}: ${errorMessage}`, error?.stack);
      
      // Don't throw error - return result object instead
      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }
}
