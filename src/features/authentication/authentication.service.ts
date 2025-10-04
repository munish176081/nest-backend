import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { EmailService } from '../email/email.service';
import { sendGridEmailTemplates } from '../email/templates';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { config } from 'src/config/config';
import { AuthConfig } from './auth.config';
import { OtpService } from './otp.service';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';
import { UsersService } from '../accounts/users.service';
import { User } from '../accounts/entities/account.entity';
import { ActivityLogsService } from '../accounts/activity-logs.service';

@Injectable()
export class AuthService {
  private cache: Redis;

  constructor(
    @InjectRepository(ExternalAuthAccount)
    private readonly externalAuthAccountRepo: Repository<ExternalAuthAccount>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ActivityLogsService))
    private readonly activityLogsService: ActivityLogsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {
    // TODO: change below to use depency injection
    this.cache = new Redis(configService.get('redis.url'), {
      db: 1,
      ...(this.configService.get('cloudProvider') === 'heroku' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });
  }

  async getAccountById(id: string) {
    return this.externalAuthAccountRepo.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async createOrGetAccount({
    externalId,
    provider,
    userData,
    raw,
  }: {
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
  }) {
    const { email, imageUrl, ip, firstName, lastName } = userData;

    let account = await this.externalAuthAccountRepo.findOne({
      where: {
        externalId,
        provider,
      },
      relations: { user: true },
    });
    console.log('Account found:', account ? 'yes' : 'no');
    console.log('Account user:', account?.user);
    console.log('Account details:', account);

    if (!account) {
      // First check if a user already exists with this email
      const existingUser = await this.usersService.getExistByUsernameOrEmail({ email });
      
      let user = existingUser;
      
      // If no user exists, create one
      if (!existingUser) {
        user = await this.usersService.createByAccount({
          email,
          imageUrl,
          ip,
          firstName,
          lastName,
        });
      }

      // Create the external account and link it to the user
      account = this.externalAuthAccountRepo.create({
        email,
        externalId,
        provider,
        raw,
        user: user,
      });

      await this.externalAuthAccountRepo.save(account);
    }

    if (account.user?.status === 'suspended') {
      throw new UnauthorizedException('User is suspended');
    }

    // Ensure the user is loaded
    if (!account.user) {
      const user = await this.usersService.getExistByUsernameOrEmail({ email });
      if (user) {
        account.user = user;
        await this.externalAuthAccountRepo.save(account);
      } else {
        throw new UnauthorizedException('User not found');
      }
    }

    return account;
  }

  async validateUser(usernameOrEmail: string, password: string) {
    if (!usernameOrEmail) {
      throw new UnauthorizedException(
        'Username or email and password to sign-in',
      );
    }

    const user = await this.usersService.validateAndGetUser(usernameOrEmail);

    if (!user.hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async signUp(signupBody: SignupDto, ip?: string, userAgent?: string) {
    
    if (signupBody.confirmPassword !== signupBody.password) {
      throw new BadRequestException(
        'password and confirmPassword do not match',
      );
    }

    const existUser = await this.usersService.getExistByUsernameOrEmail({
      email: signupBody.email,
    });

    if (existUser) {
      throw new BadRequestException(
        `Email already exists`,
      );
    }

    const hashedPassword = await this.hashPassword(signupBody.password);

    const user = await this.usersService.create({
      email: signupBody.email,
      username: signupBody.username,
      hashedPassword,
      ip,
    });

    // Log user signup activity
    try {
      await this.activityLogsService.logUserSignup(user, ip, userAgent);
    } catch (error) {
      console.error('Failed to log user signup activity:', error);
      // Don't throw error as this is not critical for signup flow
    }

    // Send verification based on configuration
    if (AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION) {
      await this.sendEmailVerificationOtp(user);
    } else {
      const token = await this.cacheEmailVerificationToken(user);
      await this.sendEmailVerificationEmail(user, token);
    }

    return user;
  }

  async requestEmailVerify(email: string) {
    const user = await this.usersService.getBy({
      email,
    });

    if (!user) {
      throw new BadRequestException('User not found with this email');
    }

    if (user.status === 'active') {
      throw new BadRequestException('User is already verified');
    }

    // Send verification based on configuration
    if (AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION) {
      await this.sendEmailVerificationOtp(user);
    } else {
      const token = await this.cacheEmailVerificationToken(user);
      await this.sendEmailVerificationEmail(user, token);
    }

    return { message: 'Email verification code sent successfully' };
  }

  async verifyEmail(verifyEmailBody: VerifyEmailDto) {
    const { token, userId } = verifyEmailBody;

    // Use token-based verification (fallback)
    const { key } = this.getEmailVerificationKeys(userId);
    const cacheToken = await this.cache.get(key);

    if (cacheToken !== token) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.usersService.verifyUser(userId);
    await this.cache.del(key);
  }

  async resetEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto) {
    const { email, otp } = verifyEmailOtpBody;

    const { key } = this.getResetPasswordOtpKeys(email);
    const isValid = await this.otpService.validateOtp(key, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.usersService.getBy({ email });
    const token = await this.cacheEmailVerificationToken(user);

    return { userId: user.id, token: token, message: 'Email verified successfully' };
  }

  async verifyEmailOtp(verifyEmailOtpBody: VerifyEmailOtpDto) {
    const { email, otp } = verifyEmailOtpBody;

    const { key } = this.getEmailVerificationOtpKeys(email);
    const isValid = await this.otpService.validateOtp(key, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.usersService.getBy({ email });
    await this.usersService.verifyUserByEmail(email);

    // Return userId after successful verification
    return {  message: 'Email verified successfully' };
  }

  async forgotPassword(forgotPasswordBody: ForgotPasswordDto) {
    const { email } = forgotPasswordBody;

    const user = await this.usersService.getBy({ email });

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    if (user.status !== 'active') {
      throw new BadRequestException('User is not active');
    }

    if (!user.hashedPassword) {
      throw new BadRequestException('User does not have a password');
    }

    // Send reset code based on configuration
    if (AuthConfig.USE_OTP_FOR_FORGOT_PASSWORD) {
      await this.sendPasswordResetOtp(user);
    } else {
      await this.sendPasswordResetToken(user);
    }

    return { message: 'Password reset code sent successfully' };
  }

  async resetPassword(resetPasswordBody: ResetPasswordDto) {
    const { token, password, userId, confirmPassword } = resetPasswordBody;
    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    // Use token-based reset (fallback)
    // We are not using token service for now it is just a demo
    const { key } = this.getResetPasswordKeys(userId);
    const cacheToken = await this.cache.get(key);

    // if (cacheToken !== token) {
    //   throw new UnauthorizedException('Invalid token');
    // }

    const hashedPassword = await this.hashPassword(password);
    await this.usersService.resetPassword(userId, hashedPassword);
    await this.cache.del(key);

    return { message: 'Password reset successfully' };
  }

  async resetPasswordOtp(resetPasswordOtpBody: ResetPasswordOtpDto) {
    const { email, otp, password, confirmPassword } = resetPasswordOtpBody;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const { key } = this.getResetPasswordOtpKeys(email);
    const isValid = await this.otpService.validateOtp(key, otp);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.usersService.getBy({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const hashedPassword = await this.hashPassword(password);
    await this.usersService.resetPassword(user.id, hashedPassword);

    return { message: 'Password reset successfully' };
  }

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  // OTP-based email verification methods
  private async sendEmailVerificationOtp(user: User) {
    const { key, timeKey } = this.getEmailVerificationOtpKeys(user.email);
    // Check cooldown
    const canRequest = await this.otpService.canRequestOtp(timeKey);
    if (!canRequest) {
      const remainingTime = await this.otpService.getRemainingCooldown(timeKey);
      throw new BadRequestException(
        `Please wait ${remainingTime} seconds before requesting another verification code`,
      );
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(key, otp);
    await this.otpService.setOtpCooldown(timeKey);

    await this.emailService.sendEmailWithTemplate({
      templateId: sendGridEmailTemplates.emailVerificationWithOtp,
      recipient: user.email,
      dynamicTemplateData: {
        username: user.name,
        otp: otp,
        verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email-otp`,
      },
    });
    console.log(`${this.configService.get('apiUrl')}/api/v1/auth/verify-email-otp`, otp, "OTP SERVICE");
  }

  // OTP-based password reset methods
  private async sendPasswordResetOtp(user: User) {
    const { key, timeKey } = this.getResetPasswordOtpKeys(user.email);

    // Check cooldown
    const canRequest = await this.otpService.canRequestOtp(timeKey);
    if (!canRequest) {
      const remainingTime = await this.otpService.getRemainingCooldown(timeKey);
      throw new BadRequestException(
        `Please wait ${remainingTime} seconds before requesting another reset code`,
      );
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(key, otp);
    await this.otpService.setOtpCooldown(timeKey);

    await this.emailService.sendEmailWithTemplate({
      templateId: sendGridEmailTemplates.resetPasswordWithOtp,
      recipient: user.email,
      dynamicTemplateData: {
        otp: otp,
        resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password-otp?email=${user.email}`,
      },
    });
    console.log(otp, `${this.configService.get('siteUrl')}/auth/reset-password-otp?email=${user.email}`, "RESET PASSWORD URL")
  }

  // Token-based methods (fallback)
  private async sendPasswordResetToken(user: User) {
    const { timeKey, key } = this.getResetPasswordKeys(user.id);

    // Check if the user has requested a password reset recently
    const lastRequestTime = await this.cache.get(timeKey);
    const cooldownPeriod = config.resetPasswordCooldownPeriod;

    if (
      lastRequestTime &&
      Date.now() / 1000 - parseInt(lastRequestTime) < cooldownPeriod
    ) {
      throw new BadRequestException(
        'Please wait before requesting another password reset',
      );
    }

    const token = randomBytes(32).toString('hex');

    await Promise.all([
      this.cache.set(key, token, 'EX', config.resetPasswordCacheTtl),
      this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownPeriod),
    ]);

    await this.emailService.sendEmailWithTemplate({
      templateId: sendGridEmailTemplates.resetPassword,
      recipient: user.email,
      dynamicTemplateData: {
        resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password?token=${token}&userId=${user.id}`,
      },
    });
  }

  private async cacheEmailVerificationToken(user: User) {
    const { key, timeKey } = this.getEmailVerificationKeys(user.email);

    // Check if the user has requested a verification recently
    const lastRequestTime = await this.cache.get(timeKey);
    const cooldownPeriod = config.emailVerificationCooldownPeriod;

    if (
      lastRequestTime &&
      Date.now() / 1000 - parseInt(lastRequestTime) < cooldownPeriod
    ) {
      throw new BadRequestException(
        'Please wait before requesting another email verification link',
      );
    }

    const token = randomBytes(32).toString('hex');

    await Promise.all([
      this.cache.set(key, token, 'EX', config.resetPasswordCacheTtl),
      this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownPeriod),
    ]);

    return token;
  }

  private async sendEmailVerificationEmail(user: User, token: string) {
    console.log(`${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`);
    await this.emailService.sendEmailWithTemplate({
      templateId: sendGridEmailTemplates.emailVerification,
      recipient: user.email,
      dynamicTemplateData: {
        username: user.username,
        verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`,
      },
    });
  }

  // Key generation methods
  private getEmailVerificationKeys(userId: string) {
    return {
      timeKey: `email-verification-time:${userId}`,
      key: `email-verification:${userId}`,
    };
  }

  private getEmailVerificationOtpKeys(email: string) {
    return {
      timeKey: `email-verification-otp-time:${email}`,
      key: `email-verification-otp:${email}`,
    };
  }

  private getResetPasswordKeys(userId: string) {
    return {
      timeKey: `reset-password-time:${userId}`,
      key: `reset-password:${userId}`,
    };
  }

  private getResetPasswordOtpKeys(email: string) {
    return {
      timeKey: `reset-password-otp-time:${email}`,
      key: `reset-password-otp:${email}`,
    };
  }
}
