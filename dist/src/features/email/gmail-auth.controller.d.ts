import { ConfigService } from '@nestjs/config';
export declare class GmailAuthController {
    private readonly configService;
    constructor(configService: ConfigService);
    auth(): {
        url: string;
    };
    callback(code: string): Promise<{
        error: string;
        success?: undefined;
        message?: undefined;
        tokens?: undefined;
    } | {
        success: boolean;
        message: string;
        tokens: {
            access_token: string;
            refresh_token: string;
            expiry_date: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        tokens?: undefined;
    }>;
}
