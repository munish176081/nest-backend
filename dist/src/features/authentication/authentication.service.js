"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const typeorm_1 = require("@nestjs/typeorm");
const external_auth_accounts_entity_1 = require("./entities/external-auth-accounts.entity");
const typeorm_2 = require("typeorm");
const email_service_1 = require("../email/email.service");
const templates_1 = require("../email/templates");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const crypto_1 = require("crypto");
const config_2 = require("../../config/config");
const auth_config_1 = require("./auth.config");
const otp_service_1 = require("./otp.service");
const users_service_1 = require("../accounts/users.service");
const activity_logs_service_1 = require("../accounts/activity-logs.service");
let AuthService = class AuthService {
    constructor(externalAuthAccountRepo, usersService, activityLogsService, emailService, configService, otpService) {
        this.externalAuthAccountRepo = externalAuthAccountRepo;
        this.usersService = usersService;
        this.activityLogsService = activityLogsService;
        this.emailService = emailService;
        this.configService = configService;
        this.otpService = otpService;
        this.cache = new ioredis_1.Redis(configService.get('redis.url'), {
            db: 1,
            ...(this.configService.get('cloudProvider') === 'heroku' && {
                tls: {
                    rejectUnauthorized: false,
                },
            }),
        });
    }
    async getAccountById(id) {
        return this.externalAuthAccountRepo.findOne({
            where: { id },
            relations: { user: true },
        });
    }
    async createOrGetAccount({ externalId, provider, userData, raw, }) {
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
            const existingUser = await this.usersService.getExistByUsernameOrEmail({ email });
            let user = existingUser;
            if (!existingUser) {
                user = await this.usersService.createByAccount({
                    email,
                    imageUrl,
                    ip,
                    firstName,
                    lastName,
                });
            }
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
            throw new common_1.UnauthorizedException('User is suspended');
        }
        if (!account.user) {
            const user = await this.usersService.getExistByUsernameOrEmail({ email });
            if (user) {
                account.user = user;
                await this.externalAuthAccountRepo.save(account);
            }
            else {
                throw new common_1.UnauthorizedException('User not found');
            }
        }
        return account;
    }
    async validateUser(usernameOrEmail, password) {
        if (!usernameOrEmail) {
            throw new common_1.UnauthorizedException('Username or email and password to sign-in');
        }
        const user = await this.usersService.validateAndGetUser(usernameOrEmail);
        if (!user.hashedPassword) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
    }
    async signUp(signupBody, ip, userAgent) {
        if (signupBody.confirmPassword !== signupBody.password) {
            throw new common_1.BadRequestException('password and confirmPassword do not match');
        }
        const existUser = await this.usersService.getExistByUsernameOrEmail({
            email: signupBody.email,
        });
        if (existUser) {
            throw new common_1.BadRequestException(`Email already exists`);
        }
        const hashedPassword = await this.hashPassword(signupBody.password);
        const user = await this.usersService.create({
            email: signupBody.email,
            username: signupBody.username,
            hashedPassword,
            ip,
        });
        try {
            await this.activityLogsService.logUserSignup(user, ip, userAgent);
        }
        catch (error) {
            console.error('Failed to log user signup activity:', error);
        }
        if (auth_config_1.AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION) {
            await this.sendEmailVerificationOtp(user);
        }
        else {
            const token = await this.cacheEmailVerificationToken(user);
            await this.sendEmailVerificationEmail(user, token);
        }
        return user;
    }
    async requestEmailVerify(email) {
        const user = await this.usersService.getBy({
            email,
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found with this email');
        }
        if (user.status === 'active') {
            throw new common_1.BadRequestException('User is already verified');
        }
        if (auth_config_1.AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION) {
            await this.sendEmailVerificationOtp(user);
        }
        else {
            const token = await this.cacheEmailVerificationToken(user);
            await this.sendEmailVerificationEmail(user, token);
        }
        return { message: 'Email verification code sent successfully' };
    }
    async verifyEmail(verifyEmailBody) {
        const { token, userId } = verifyEmailBody;
        const { key } = this.getEmailVerificationKeys(userId);
        const cacheToken = await this.cache.get(key);
        if (cacheToken !== token) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        await this.usersService.verifyUser(userId);
        await this.cache.del(key);
    }
    async resetEmailOtp(verifyEmailOtpBody) {
        const { email, otp } = verifyEmailOtpBody;
        const { key } = this.getResetPasswordOtpKeys(email);
        const isValid = await this.otpService.validateOtp(key, otp);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        const user = await this.usersService.getBy({ email });
        const token = await this.cacheEmailVerificationToken(user);
        return { userId: user.id, token: token, message: 'Email verified successfully' };
    }
    async verifyEmailOtp(verifyEmailOtpBody) {
        const { email, otp } = verifyEmailOtpBody;
        const { key } = this.getEmailVerificationOtpKeys(email);
        const isValid = await this.otpService.validateOtp(key, otp);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        const user = await this.usersService.getBy({ email });
        await this.usersService.verifyUserByEmail(email);
        return { message: 'Email verified successfully' };
    }
    async forgotPassword(forgotPasswordBody) {
        const { email } = forgotPasswordBody;
        const user = await this.usersService.getBy({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found with this email');
        }
        if (user.status !== 'active') {
            throw new common_1.BadRequestException('User is not active');
        }
        if (!user.hashedPassword) {
            throw new common_1.BadRequestException('User does not have a password');
        }
        if (auth_config_1.AuthConfig.USE_OTP_FOR_FORGOT_PASSWORD) {
            await this.sendPasswordResetOtp(user);
        }
        else {
            await this.sendPasswordResetToken(user);
        }
        return { message: 'Password reset code sent successfully' };
    }
    async resetPassword(resetPasswordBody) {
        const { token, password, userId, confirmPassword } = resetPasswordBody;
        if (password !== confirmPassword) {
            throw new common_1.BadRequestException('Password and confirm password do not match');
        }
        const { key } = this.getResetPasswordKeys(userId);
        const cacheToken = await this.cache.get(key);
        const hashedPassword = await this.hashPassword(password);
        await this.usersService.resetPassword(userId, hashedPassword);
        await this.cache.del(key);
        return { message: 'Password reset successfully' };
    }
    async resetPasswordOtp(resetPasswordOtpBody) {
        const { email, otp, password, confirmPassword } = resetPasswordOtpBody;
        if (password !== confirmPassword) {
            throw new common_1.BadRequestException('Password and confirm password do not match');
        }
        const { key } = this.getResetPasswordOtpKeys(email);
        const isValid = await this.otpService.validateOtp(key, otp);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        const user = await this.usersService.getBy({ email });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const hashedPassword = await this.hashPassword(password);
        await this.usersService.resetPassword(user.id, hashedPassword);
        return { message: 'Password reset successfully' };
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async sendEmailVerificationOtp(user) {
        const { key, timeKey } = this.getEmailVerificationOtpKeys(user.email);
        const canRequest = await this.otpService.canRequestOtp(timeKey);
        if (!canRequest) {
            const remainingTime = await this.otpService.getRemainingCooldown(timeKey);
            throw new common_1.BadRequestException(`Please wait ${remainingTime} seconds before requesting another verification code`);
        }
        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(key, otp);
        await this.otpService.setOtpCooldown(timeKey);
        await this.emailService.sendEmailWithTemplate({
            templateId: templates_1.sendGridEmailTemplates.emailVerificationWithOtp,
            recipient: user.email,
            dynamicTemplateData: {
                username: user.name,
                otp: otp,
                verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email-otp`,
            },
        });
        console.log(`${this.configService.get('apiUrl')}/api/v1/auth/verify-email-otp`, otp, "OTP SERVICE");
    }
    async sendPasswordResetOtp(user) {
        const { key, timeKey } = this.getResetPasswordOtpKeys(user.email);
        const canRequest = await this.otpService.canRequestOtp(timeKey);
        if (!canRequest) {
            const remainingTime = await this.otpService.getRemainingCooldown(timeKey);
            throw new common_1.BadRequestException(`Please wait ${remainingTime} seconds before requesting another reset code`);
        }
        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(key, otp);
        await this.otpService.setOtpCooldown(timeKey);
        await this.emailService.sendEmailWithTemplate({
            templateId: templates_1.sendGridEmailTemplates.resetPasswordWithOtp,
            recipient: user.email,
            dynamicTemplateData: {
                otp: otp,
                resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password-otp?email=${user.email}`,
            },
        });
        console.log(otp, `${this.configService.get('siteUrl')}/auth/reset-password-otp?email=${user.email}`, "RESET PASSWORD URL");
    }
    async sendPasswordResetToken(user) {
        const { timeKey, key } = this.getResetPasswordKeys(user.id);
        const lastRequestTime = await this.cache.get(timeKey);
        const cooldownPeriod = config_2.config.resetPasswordCooldownPeriod;
        if (lastRequestTime &&
            Date.now() / 1000 - parseInt(lastRequestTime) < cooldownPeriod) {
            throw new common_1.BadRequestException('Please wait before requesting another password reset');
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        await Promise.all([
            this.cache.set(key, token, 'EX', config_2.config.resetPasswordCacheTtl),
            this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownPeriod),
        ]);
        await this.emailService.sendEmailWithTemplate({
            templateId: templates_1.sendGridEmailTemplates.resetPassword,
            recipient: user.email,
            dynamicTemplateData: {
                resetUrl: `${this.configService.get('siteUrl')}/auth/reset-password?token=${token}&userId=${user.id}`,
            },
        });
    }
    async cacheEmailVerificationToken(user) {
        const { key, timeKey } = this.getEmailVerificationKeys(user.email);
        const lastRequestTime = await this.cache.get(timeKey);
        const cooldownPeriod = config_2.config.emailVerificationCooldownPeriod;
        if (lastRequestTime &&
            Date.now() / 1000 - parseInt(lastRequestTime) < cooldownPeriod) {
            throw new common_1.BadRequestException('Please wait before requesting another email verification link');
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        await Promise.all([
            this.cache.set(key, token, 'EX', config_2.config.resetPasswordCacheTtl),
            this.cache.set(timeKey, Date.now() / 1000, 'EX', cooldownPeriod),
        ]);
        return token;
    }
    async sendEmailVerificationEmail(user, token) {
        console.log(`${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`);
        await this.emailService.sendEmailWithTemplate({
            templateId: templates_1.sendGridEmailTemplates.emailVerification,
            recipient: user.email,
            dynamicTemplateData: {
                username: user.username,
                verificationUrl: `${this.configService.get('apiUrl')}/api/v1/auth/verify-email?token=${token}&userId=${user.id}`,
            },
        });
    }
    getEmailVerificationKeys(userId) {
        return {
            timeKey: `email-verification-time:${userId}`,
            key: `email-verification:${userId}`,
        };
    }
    getEmailVerificationOtpKeys(email) {
        return {
            timeKey: `email-verification-otp-time:${email}`,
            key: `email-verification-otp:${email}`,
        };
    }
    getResetPasswordKeys(userId) {
        return {
            timeKey: `reset-password-time:${userId}`,
            key: `reset-password:${userId}`,
        };
    }
    getResetPasswordOtpKeys(email) {
        return {
            timeKey: `reset-password-otp-time:${email}`,
            key: `reset-password-otp:${email}`,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(external_auth_accounts_entity_1.ExternalAuthAccount)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => activity_logs_service_1.ActivityLogsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        activity_logs_service_1.ActivityLogsService,
        email_service_1.EmailService,
        config_1.ConfigService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=authentication.service.js.map