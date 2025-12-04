import { ConfigService } from '@nestjs/config';
export declare class RecaptchaService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    verifyRecaptcha(token: string): Promise<boolean>;
}
