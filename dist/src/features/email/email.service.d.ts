import { SendGridClient } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly sendGridClient;
    private readonly configService;
    constructor(sendGridClient: SendGridClient, configService: ConfigService);
    sendTestEmail(recipient: string, body?: string): Promise<void>;
    sendEmailWithTemplate<T>({ recipient, templateId, dynamicTemplateData, }: {
        recipient: string;
        templateId: string;
        dynamicTemplateData: T;
    }): Promise<void>;
}
