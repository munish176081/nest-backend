import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
// for some reason ES6 import is not working
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sgMail = require('@sendgrid/mail');
import { MailDataRequired } from '@sendgrid/mail';

@Injectable()
export class SendGridClient {
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('sendgrid.apiKey')!);
  }

  async send(mail: MailDataRequired): Promise<void> {
    try {
      await sgMail.send(mail);
    } catch (error) {
      // TODO: use Nest.js logger
      console.log(`Failed to send email: ${error}`);

      throw error;
    }
  }
}
