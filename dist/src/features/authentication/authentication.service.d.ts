import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { DataSource, Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpService } from './otp.service';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { UsersService } from '../accounts/users.service';
import { User } from '../accounts/entities/account.entity';
import { ActivityLogsService } from '../accounts/activity-logs.service';
import { RecaptchaService } from '../../common/services/recaptcha.service';
export declare class AuthService {
    private readonly externalAuthAccountRepo;
    private readonly usersService;
    private readonly activityLogsService;
    private readonly emailService;
    private readonly configService;
    private readonly otpService;
    private readonly dataSource;
    private readonly recaptchaService;
    private readonly logger;
    private cache;
    constructor(externalAuthAccountRepo: Repository<ExternalAuthAccount>, usersService: UsersService, activityLogsService: ActivityLogsService, emailService: EmailService, configService: ConfigService, otpService: OtpService, dataSource: DataSource, recaptchaService: RecaptchaService);
    getAccountById(id: string): Promise<ExternalAuthAccount>;
    createOrGetAccount({ externalId, provider, userData, raw, }: {
        externalId: string;
        provider: string;
        userData: {
            email: string;
            imageUrl?: string;
            ip?: string;
            firstName?: string;
            lastName?: string;
        };
        raw?: Record<string, unknown>;
    }): Promise<ExternalAuthAccount>;
    validateUser(usernameOrEmail: string, password: string): Promise<User>;
    signUp(signupBody: SignupDto, ip?: string, userAgent?: string): Promise<User>;
    requestEmailVerify(email: string, allowAlreadyVerified?: boolean): Promise<{
        message: string;
    }>;
    verifyEmail(verifyEmailBody: VerifyEmailDto): Promise<void>;
    resetEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto): Promise<{
        userId: string;
        token: string;
        message: string;
    }>;
    verifyEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto): Promise<{
        user: User;
        message: string;
    }>;
    forgotPassword(forgotPasswordBody: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordBody: ResetPasswordDto): Promise<{
        message: string;
    }>;
    resetPasswordOtp(resetPasswordOtpBody: ResetPasswordOtpDto): Promise<{
        message: string;
    }>;
    private hashPassword;
    private sendEmailVerificationOtp;
    private sendPasswordResetOtp;
    private sendPasswordResetToken;
    private cacheEmailVerificationToken;
    private sendEmailVerificationEmail;
    private getEmailVerificationKeys;
    private getEmailVerificationOtpKeys;
    private getResetPasswordKeys;
    private getResetPasswordOtpKeys;
}
