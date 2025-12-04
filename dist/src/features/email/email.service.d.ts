import { EmailSendResult } from './postmark-client';
import { ConfigService } from '@nestjs/config';
import { GmailService } from './gmail.service';
export declare class EmailService {
    private readonly gmailService;
    private readonly configService;
    private readonly logger;
    constructor(gmailService: GmailService, configService: ConfigService);
    sendTestEmail(recipient: string, body?: string): Promise<EmailSendResult>;
    sendEmailWithTemplate<T>({ recipient, templateId, templateAlias, dynamicTemplateData, }: {
        recipient: string;
        templateId?: number;
        templateAlias?: string;
        dynamicTemplateData: T;
    }): Promise<EmailSendResult>;
    private getSubjectForTemplate;
}
