import { Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../authentication.service';
declare const FacebookStrategy_base: new (...args: any[]) => any;
export declare class FacebookStrategy extends FacebookStrategy_base {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    validate(req: Request, accessToken: string, refreshToken: string, profile: Profile, done: (error: Error | null, user?: any, info?: any) => void): Promise<void>;
    private getEmailFromProfile;
    private parseName;
    private getProfileImage;
    private handleValidationError;
}
export {};
