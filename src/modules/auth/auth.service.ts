import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalAuthAccount } from './entities/external-auth-accounts.entity';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { EmailService } from '../email/email.service';
import { sendGridEmailTemplates } from '../email/templates';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { config } from 'src/config/config';

@Injectable()
export class AuthService {
  private cache: Redis;

  constructor(
    @InjectRepository(ExternalAuthAccount)
    private readonly externalAuthAccountRepo: Repository<ExternalAuthAccount>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    // TODO: change below to use depency injection
    this.cache = new Redis(configService.get('redis.url'), {
      db: 1,
      ...(configService.get('cloudProvider') === 'heroku' && {
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

    if (!account) {
      account = this.externalAuthAccountRepo.create({
        email,
        externalId,
        provider,
        raw,
      });

      await this.externalAuthAccountRepo.save(account);
    }

    if (account.user?.status === 'suspended') {
      throw new UnauthorizedException('User is suspended');
    }

    if (!account.user) {
      const newUser = await this.usersService.createByAccount({
        email,
        imageUrl,
        ip,
        firstName,
        lastName,
      });

      account.user = newUser;
      await this.externalAuthAccountRepo.save(account);
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

  async signUp(signupBody: SignupDto, ip?: string) {
    if (signupBody.confirmPassword !== signupBody.password) {
      throw new BadRequestException(
        'password and confirmPassword do not match',
      );
    }

    const existUser = await this.usersService.getExistByUsernameOrEmail({
      username: signupBody.username,
      email: signupBody.email,
    });

    if (existUser) {
      throw new BadRequestException(
        `${signupBody.email === existUser.email ? 'Email' : 'Username'} already exists`,
      );
    }

    const hashedPassword = await this.hashPassword(signupBody.password);

    const user = await this.usersService.create({
      email: signupBody.email,
      username: signupBody.username,
      hashedPassword,
      ip,
    });

    const token = await this.cacheEmailVerificationToken(user);
    await this.sendEmailVerificationEmail(user, token);

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

    const token = await this.cacheEmailVerificationToken(user);
    await this.sendEmailVerificationEmail(user, token);

    return { message: 'Email code sent successfully' };
  }

  async verifyEmail(verifyEmailBody: VerifyEmailDto) {
    const { token, userId } = verifyEmailBody;

    const { key } = await this.getEmailVerificationKeys(userId);

    const cacheToken = await this.cache.get(key);

    if (cacheToken !== token) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.usersService.verifyUser(userId);

    await this.cache.del(key);
  }

  async forgotPassword(forgotPasswordBody: ForgotPasswordDto) {
    const { email } = forgotPasswordBody;

    const user = await this.usersService.getBy({
      email,
    });

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    if (user.status !== 'active') {
      throw new BadRequestException('User is not active');
    }

    if (!user.hashedPassword) {
      throw new BadRequestException('User does not have a password');
    }

    const { timeKey, key } = this.getResetPasswordKeys(user.id);

    // Check if the user has requested a password reset recently
    const lastRequestTime = await this.cache.get(timeKey);

    const cooldownPeriod = config.resetPasswordCooldownPeriod; // Cooldown period in seconds (e.g., 5 minutes)

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

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(resetPasswordBody: ResetPasswordDto) {
    const { token, password, userId, confirmPassword } = resetPasswordBody;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const { key } = await this.getResetPasswordKeys(userId);

    const cacheToken = await this.cache.get(key);

    if (cacheToken !== token) {
      throw new UnauthorizedException('Invalid token');
    }

    const hashedPassword = await this.hashPassword(password);

    await this.usersService.resetPassword(userId, hashedPassword);

    await this.cache.del(key);

    return { message: 'Password reset successfully' };
  }

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  private async cacheEmailVerificationToken(user: User) {
    const { key, timeKey } = this.getEmailVerificationKeys(user.id);

    // Check if the user has requested a password reset recently
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
    await this.emailService.sendEmailWithTemplate({
      templateId: sendGridEmailTemplates.emailVerification,
      recipient: user.email,
      dynamicTemplateData: {
        username: user.username,
        verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`,
      },
    });
  }

  private getEmailVerificationKeys(userId: string) {
    return {
      timeKey: `email-verification-time:${userId}`,
      key: `email-verification:${userId}`,
    };
  }

  private getResetPasswordKeys(userId: string) {
    return {
      timeKey: `reset-password-time:${userId}`,
      key: `reset-password:${userId}`,
    };
  }
}
