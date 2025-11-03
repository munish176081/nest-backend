import { Injectable, Logger } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient, EmailSendResult } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly configService: ConfigService,
  ) {}

  async sendTestEmail(
    recipient: string,
    body = 'This is a test mail',
  ): Promise<EmailSendResult> {
    const mail: MailDataRequired = {
      to: recipient,
      from: this.configService.get('sendgrid.email'),
      subject: 'Test email',
      content: [{ type: 'text/html', value: body }],
    };
    return await this.sendGridClient.send(mail);
  }

  async sendEmailWithTemplate<T>({
    recipient,
    templateId,
    dynamicTemplateData,
  }: {
    recipient: string;
    templateId: string;
    dynamicTemplateData: T;
  }): Promise<EmailSendResult> {
    const mail: MailDataRequired = {
      to: recipient,
      from: this.configService.get('email.sendgrid.email'),
      templateId,
      dynamicTemplateData,
    };
    return await this.sendGridClient.send(mail);
  }
}
