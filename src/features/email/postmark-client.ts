import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { ServerClient } from 'postmark';

export interface EmailSendResult {
  success: boolean;
  error?: string;
  errorCode?: number;
}

export interface PostmarkEmailOptions {
  to: string;
  from: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  templateId?: number;
  templateAlias?: string;
  templateModel?: Record<string, any>;
}

@Injectable()
export class PostmarkClient {
  private readonly logger = new Logger(PostmarkClient.name);
  private readonly client: ServerClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.postmark.apiKey');
    if (!apiKey) {
      throw new Error('Postmark API key is not configured');
    }
    this.client = new ServerClient(apiKey);
  }

  /**
   * Formats the From field with display name "pups4sale"
   */
  private formatFromField(email: string): string {
    // If email already contains a display name, extract just the email
    const emailMatch = email.match(/<(.+)>/);
    const emailAddress = emailMatch ? emailMatch[1] : email;
    
    // Format as "pups4sale <email@example.com>"
    return `pups4sale <${emailAddress}>`;
  }

  async send(options: PostmarkEmailOptions): Promise<EmailSendResult> {
    try {
      // Format From field with display name "pups4sale"
      const fromField = this.formatFromField(options.from);
      
      if (options.templateId || options.templateAlias) {
        // Send email with template
        // Postmark accepts either TemplateId OR TemplateAlias, not both
        const templateParams: any = {
          From: fromField,
          To: options.to,
          TemplateModel: options.templateModel || {},
        };

        if (options.templateId) {
          templateParams.TemplateId = options.templateId;
        } else if (options.templateAlias) {
          templateParams.TemplateAlias = options.templateAlias;
        }

        await this.client.sendEmailWithTemplate(templateParams);

        this.logger.log(`Email sent successfully to ${options.to} using template ${options.templateId || options.templateAlias}`);
        return { success: true };
      } else {
        // Send plain email
        await this.client.sendEmail({
          From: fromField,
          To: options.to,
          Subject: options.subject || '',
          HtmlBody: options.htmlBody,
          TextBody: options.textBody,
        });

        this.logger.log(`Email sent successfully to ${options.to}`);
        return { success: true };
      }
    } catch (error: any) {
      const errorMessage = error?.Message || error?.message || 'Unknown error';
      const errorCode = error?.ErrorCode || error?.statusCode || error?.code || 500;

      this.logger.error(`Failed to send email to ${options.to}: ${errorMessage}`, error?.stack);

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }
}

