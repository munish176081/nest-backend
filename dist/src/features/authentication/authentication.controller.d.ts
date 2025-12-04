import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { RequestEmailVerifyDto } from './dto/request-email-verify.dto';
import { AuthService } from './authentication.service';
export declare class AuthController {
    private readonly configService;
    private readonly authService;
    private readonly logger;
    constructor(configService: ConfigService, authService: AuthService);
    handleGoogleConfig(): {
        clientId: string;
        clientSecret: string;
        callbackURL: string;
        apiUrl: any;
    };
    handleFacebookConfig(): {
        clientId: string;
        clientSecret: string;
        callbackURL: string;
        apiUrl: any;
        oauthTimeout: any;
    };
    handleGoogleLogin(): void;
    handleAuthError(req: Request, res: Response): void;
    handleGoogleCallback(req: Request, res: Response): void;
    handleFacebookLogin(): void;
    handleFacebookCallback(req: Request, res: Response): void;
    handleLogin(req: Request): {
        id: string;
        email: string;
        name: string;
        username: string;
        status: import("../accounts/entities/account.entity").UserStatusEnum;
        imageUrl: string;
        createdAt: string;
        role: import("../accounts/entities/account.entity").UserRoleEnum;
        isSuperAdmin: boolean;
    } & Express.User;
    handleSignup(req: Request, signupBody: SignupDto): Promise<import("../accounts/entities/account.entity").User>;
    requestEmailVerify(req: Request): Promise<{
        message: string;
    }>;
    requestEmailVerifyByEmail(requestEmailVerifyDto: RequestEmailVerifyDto): Promise<{
        message: string;
    }>;
    verifyEmail(verifyEmailBody: VerifyEmailDto, res: Response): Promise<void>;
    verifyEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto, req: Request): Promise<unknown>;
    forgotPassword(req: Request, forgotPasswordBody: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordBody: ResetPasswordDto, req: Request): Promise<{
        message: string;
    }>;
    resetPasswordOtp(resetPasswordOtpBody: ResetPasswordOtpDto, req: Request): Promise<{
        message: string;
    }>;
    errorRedirect(req: Request, res: Response): Promise<void>;
    handleLogout(req: Request, res: Response): Promise<void>;
    getSession(req: Request): Promise<{
        sessionId: string;
        userId: string;
        authenticated: boolean;
    }>;
}
