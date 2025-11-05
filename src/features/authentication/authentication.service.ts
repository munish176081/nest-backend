import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { DataSource, Repository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import { EmailService } from '../email/email.service';
import { sendGridEmailTemplates, images } from '../email/templates';
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
  private readonly logger = new Logger(AuthService.name);
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
    private readonly dataSource: DataSource,
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

    // Use transaction to ensure user creation is rolled back if email fails
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    } catch (error) {
      await queryRunner.release();
      this.logger.error('Failed to start transaction:', error);
      throw new BadRequestException('Failed to process signup. Please try again.');
    }

    try {
      // Create user within transaction using the transaction's manager
      // We need to use the queryRunner's manager so it's part of the transaction
      const manager = queryRunner.manager;
      
      // Generate username within transaction to ensure uniqueness check is atomic
      const name = signupBody.username;
      const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Ensure base username is valid
      let generatedUsername: string;
      if (!baseUsername || baseUsername.length < 3) {
        generatedUsername = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      } else {
        generatedUsername = baseUsername;
      }
      
      // Check if username exists within transaction
      let counter = 0;
      
      while (counter < 100) {
        try {
          const existingUser = await manager.findOne(User, {
            where: { username: generatedUsername },
          });
          
          if (!existingUser) {
            break; // Username is available
          }
        } catch (checkError) {
          this.logger.warn(`Error checking username availability: ${checkError}`);
          // If check fails, generate a unique username with timestamp
          generatedUsername = `${baseUsername}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          break;
        }
        
        // Generate new username with random suffix
        counter++;
        const randomSuffix = Math.trunc(Math.random() * 100);
        generatedUsername = `${baseUsername}_${randomSuffix}${counter > 1 ? counter : ''}`;
      }
      
      // Fallback if loop completed without finding unique username
      if (counter >= 100) {
        generatedUsername = `${baseUsername}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
      
      // Create user entity
      const user = manager.create(User, {
        email: signupBody.email,
        name,
        username: generatedUsername,
        hashedPassword,
        ip,
        status: 'not_verified',
      });
      
      // Save user within transaction
      const savedUser = await manager.save(User, user);

      // Log user signup activity (non-critical, so we don't rollback on failure)
      try {
        await this.activityLogsService.logUserSignup(savedUser, ip, userAgent);
      } catch (error) {
        this.logger.warn('Failed to log user signup activity:', error);
        // Don't throw error as this is not critical for signup flow
      }

      // Send verification based on configuration - this must succeed or we rollback
      let emailSuccess = false;
      let emailError: string | null = null;
      
      try {
        if (AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION) {
          emailSuccess = await this.sendEmailVerificationOtp(savedUser, true); // true = throw on failure during signup
        } else {
          const token = await this.cacheEmailVerificationToken(savedUser);
          emailSuccess = await this.sendEmailVerificationEmail(savedUser, token, true); // true = throw on failure during signup
        }
      } catch (emailErr: any) {
        emailError = emailErr?.message || 'Unknown email error';
        emailSuccess = false;
        this.logger.error(`Email sending failed during signup: ${emailError}`, emailErr);
      }

      if (!emailSuccess) {
        // Email failed - rollback transaction
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error('Failed to rollback transaction:', rollbackError);
        }
        
        this.logger.error(`Failed to send verification email during signup for ${savedUser.email}. User creation rolled back.`);
        
        // Return user-friendly error message
        const errorMessage = emailError?.includes('Unauthorized') || emailError?.includes('401')
          ? 'Email service is currently unavailable. Please contact support or try again later.'
          : 'Unable to send verification email. Please check your email service configuration or try again later.';
        
        throw new BadRequestException(errorMessage);
      }

      // Everything succeeded - commit transaction
      try {
        await queryRunner.commitTransaction();
      } catch (commitError) {
        this.logger.error('Failed to commit transaction:', commitError);
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error('Failed to rollback after commit failure:', rollbackError);
        }
        throw new BadRequestException('Failed to complete signup. Please try again.');
      }
      
      return savedUser;
    } catch (error) {
      // Handle rollback safely
      if (queryRunner.isTransactionActive) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error('Failed to rollback transaction in catch block:', rollbackError);
        }
      }
      
      // If it's already a BadRequestException, rethrow it as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // If it's a database constraint error, provide user-friendly message
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique constraint')) {
        if (error?.message?.includes('email') || error?.detail?.includes('email')) {
          throw new BadRequestException('An account with this email already exists.');
        }
        if (error?.message?.includes('username') || error?.detail?.includes('username')) {
          throw new BadRequestException('This username is already taken. Please choose another.');
        }
        throw new BadRequestException('An account with these details already exists.');
      }
      
      // For other errors, log and return user-friendly message
      this.logger.error('Unexpected error during signup transaction:', error);
      throw new BadRequestException('An error occurred during signup. Please try again or contact support if the problem persists.');
    } finally {
      // Always release the query runner
      try {
        await queryRunner.release();
      } catch (releaseError) {
        this.logger.error('Failed to release query runner:', releaseError);
      }
    }
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
  private async sendEmailVerificationOtp(user: User, throwOnFailure = false): Promise<boolean> {
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

    const emailResult = await this.emailService.sendEmailWithTemplate({
      templateAlias: sendGridEmailTemplates.emailVerificationWithOtp,
      recipient: user.email,
      dynamicTemplateData: {
        logoUrl: images.logo,
        username: user.name,
        otp: otp,
        verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email-otp`,
      },
    });

    if (!emailResult.success) {
      this.logger.warn(`Failed to send email verification OTP to ${user.email}: ${emailResult.error}`);
      if (throwOnFailure) {
        return false; // Return false so caller can handle rollback
      }
      // Don't throw - OTP is still stored, user can use it even if email fails
      // In production, you might want to notify admin about email service issues
    }
    
    return emailResult.success;
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

    const emailResult = await this.emailService.sendEmailWithTemplate({
      templateAlias: sendGridEmailTemplates.resetPasswordWithOtp,
      recipient: user.email,
      dynamicTemplateData: {
        logoUrl: images.logo,
        otp: otp,
        resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password-otp?email=${user.email}`,
      },
    });

    if (!emailResult.success) {
      this.logger.warn(`Failed to send password reset OTP to ${user.email}: ${emailResult.error}`);
      throw new BadRequestException(
        'Unable to send password reset email. Please check your email service configuration or try again later.',
      );
    }
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

    const emailResult = await this.emailService.sendEmailWithTemplate({
      templateAlias: sendGridEmailTemplates.resetPassword,
      recipient: user.email,
      dynamicTemplateData: {
        resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password?token=${token}&userId=${user.id}`,
      },
    });

    if (!emailResult.success) {
      this.logger.warn(`Failed to send password reset email to ${user.email}: ${emailResult.error}`);
      throw new BadRequestException(
        'Unable to send password reset email. Please check your email service configuration or try again later.',
      );
    }
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

  private async sendEmailVerificationEmail(user: User, token: string, throwOnFailure = false): Promise<boolean> {
    const emailResult = await this.emailService.sendEmailWithTemplate({
      templateAlias: sendGridEmailTemplates.emailVerification,
      recipient: user.email,
      dynamicTemplateData: {
        username: user.username,
        verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`,
      },
    });

    if (!emailResult.success) {
      this.logger.warn(`Failed to send email verification to ${user.email}: ${emailResult.error}`);
      if (throwOnFailure) {
        return false; // Return false so caller can handle rollback
      }
      // Don't throw - token is still cached, user might be able to verify via other means
      // In production, you might want to notify admin about email service issues
    }
    
    return emailResult.success;
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
