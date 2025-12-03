import { Injectable, Logger } from '@nestjs/common';
import { EmailSendResult } from './postmark-client';
import { ConfigService } from '@nestjs/config';
import { GmailService } from './gmail.service';
import { TemplateRenderer } from './template-renderer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly gmailService: GmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendTestEmail(
    recipient: string,
    body = 'This is a test mail',
  ): Promise<EmailSendResult> {
    return await this.gmailService.sendMail(
      recipient,
      'Test email',
      body,
    );
  }

  async sendEmailWithTemplate<T>({
    recipient,
    templateId,
    templateAlias,
    dynamicTemplateData,
  }: {
    recipient: string;
    templateId?: number;
    templateAlias?: string;
    dynamicTemplateData: T;
  }): Promise<EmailSendResult> {
    // Gmail API doesn't support templates, so we render HTML manually
    if (!templateAlias) {
      throw new Error('templateAlias is required for Gmail email service');
    }

    try {
      // Render the HTML template with dynamic data
      const html = TemplateRenderer.renderTemplate(
        templateAlias,
        dynamicTemplateData as Record<string, any>,
      );

      // Determine subject based on template
      const subject = this.getSubjectForTemplate(templateAlias);

      return await this.gmailService.sendMail(recipient, subject, html);
    } catch (error: any) {
      this.logger.error(`Failed to render or send email template: ${error.message}`, error?.stack);
      return {
        success: false,
        error: error.message || 'Failed to send email',
        errorCode: 500,
      };
    }
  }

  /**
   * Gets the email subject based on the template alias
   */
  private getSubjectForTemplate(templateAlias: string): string {
    const subjectMap: Record<string, string> = {
      'welcome': `Welcome to ${process.env.SITE_NAME}! Verify Your Email Address`,
      'password-reset': `Reset Your ${process.env.SITE_NAME} Password`,
      'welcome-1': `Welcome to ${process.env.SITE_NAME}! Verify Your Email Address`,
      'welcome-3': `${process.env.SITE_NAME} - OTP Code for Password Reset`,
      'welcome-4': `${process.env.SITE_NAME} - New Contact Form Submission`,
      'welcome-5': `We Received Your Enquiry - ${process.env.SITE_NAME}`,
    };

    return subjectMap[templateAlias] || `Email from ${process.env.SITE_NAME}`;
  }
}
