import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../authentication.service';
declare const GoogleStrategy_base: new (...args: any[]) => Strategy;
export declare class GoogleStrategy extends GoogleStrategy_base {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    validate(req: Request, _accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void>;
}
export {};
