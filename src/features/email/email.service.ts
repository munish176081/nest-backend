import { Injectable } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly configService: ConfigService,
  ) {}

  async sendTestEmail(
    recipient: string,
    body = 'This is a test mail',
  ): Promise<void> {
    const mail: MailDataRequired = {
      to: recipient,
      from: this.configService.get('sendgrid.email'),
      subject: 'Test email',
      content: [{ type: 'text/html', value: body }],
    };
    await this.sendGridClient.send(mail);
  }

  async sendEmailWithTemplate<T>({
    recipient,
    templateId,
    dynamicTemplateData,
  }: {
    recipient: string;
    templateId: string;
    dynamicTemplateData: T;
  }): Promise<void> {
    const mail: MailDataRequired = {
      to: recipient,
      from: this.configService.get('email.sendgrid.email'),
      templateId,
      dynamicTemplateData,
    };
    await this.sendGridClient.send(mail);
  }
}
