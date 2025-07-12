import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { AuthService } from './authentication.service';
export declare class AuthController {
    private readonly configService;
    private readonly authService;
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
    } & Express.User;
    handleSignup(req: Request, signupBody: SignupDto): Promise<unknown>;
    requestEmailVerify(req: Request): Promise<{
        message: string;
    }>;
    verifyEmail(verifyEmailBody: VerifyEmailDto, res: Response): Promise<void>;
    verifyEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto): Promise<{
        message: string;
    }>;
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
}
