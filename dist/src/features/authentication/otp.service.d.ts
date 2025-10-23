import { ConfigService } from '@nestjs/config';
export declare class OtpService {
    private readonly configService;
    private cache;
    constructor(configService: ConfigService);
    generateOtp(length?: number): string;
    storeOtp(key: string, otp: string, expirySeconds?: number): Promise<void>;
    getOtp(key: string): Promise<string | null>;
    validateOtp(key: string, providedOtp: string): Promise<boolean>;
    canRequestOtp(timeKey: string, cooldownSeconds?: number): Promise<boolean>;
    setOtpCooldown(timeKey: string, cooldownSeconds?: number): Promise<void>;
    getRemainingCooldown(timeKey: string): Promise<number>;
    deleteOtp(key: string, timeKey?: string): Promise<void>;
}
