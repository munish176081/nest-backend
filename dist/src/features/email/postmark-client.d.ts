import { ConfigService } from '@nestjs/config';
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
export declare class PostmarkClient {
    private readonly configService;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService);
    private formatFromField;
    send(options: PostmarkEmailOptions): Promise<EmailSendResult>;
}
