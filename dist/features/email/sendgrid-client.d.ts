import { ConfigService } from '@nestjs/config';
import { MailDataRequired } from '@sendgrid/mail';
export declare class SendGridClient {
    private readonly configService;
    constructor(configService: ConfigService);
    send(mail: MailDataRequired): Promise<void>;
}
