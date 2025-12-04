import { ConfigService } from '@nestjs/config';
import { EmailSendResult } from './postmark-client';
export declare class GmailService {
    private readonly configService;
    private readonly logger;
    private oauth2Client;
    constructor(configService: ConfigService);
    private hasCredentials;
    private ensureValidToken;
    private getUserEmail;
    sendMail(to: string, subject: string, html: string, from?: string): Promise<EmailSendResult>;
}
