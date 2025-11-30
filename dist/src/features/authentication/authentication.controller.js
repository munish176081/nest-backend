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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const google_oauth_guard_1 = require("./guards/google-oauth.guard");
const config_1 = require("@nestjs/config");
const facebook_oauth_guard_1 = require("./guards/facebook-oauth.guard");
const local_auth_guard_1 = require("./guards/local-auth.guard");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const signup_dto_1 = require("./dto/signup.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const verify_email_otp_dto_1 = require("./dto/verify-email-otp.dto");
const reset_password_otp_dto_1 = require("./dto/reset-password-otp.dto");
const request_email_verify_dto_1 = require("./dto/request-email-verify.dto");
const authentication_service_1 = require("./authentication.service");
const user_dto_1 = require("../accounts/dto/user.dto");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
const parseIpFromReq_1 = require("../../helpers/parseIpFromReq");
const common_2 = require("@nestjs/common");
const createUserTokenData_1 = require("../../helpers/createUserTokenData");
let AuthController = AuthController_1 = class AuthController {
    constructor(configService, authService) {
        this.configService = configService;
        this.authService = authService;
        this.logger = new common_2.Logger(AuthController_1.name);
    }
    handleGoogleConfig() {
        return {
            clientId: this.configService.get('google.clientId') ? 'configured' : 'not configured',
            clientSecret: this.configService.get('google.clientSecret') ? 'configured' : 'not configured',
            callbackURL: `${this.configService.get('apiUrl')}/api/v1/auth/google/callback`,
            apiUrl: this.configService.get('apiUrl'),
        };
    }
    handleFacebookConfig() {
        return {
            clientId: this.configService.get('facebook.clientId') ? 'configured' : 'not configured',
            clientSecret: this.configService.get('facebook.clientSecret') ? 'configured' : 'not configured',
            callbackURL: `${this.configService.get('apiUrl')}/api/v1/auth/facebook/callback`,
            apiUrl: this.configService.get('apiUrl'),
            oauthTimeout: this.configService.get('oauthTimeout'),
        };
    }
    handleGoogleLogin() { }
    handleAuthError(req, res) {
        const messages = req.session?.messages || [];
        const errorMessage = messages.length > 0 ? messages[messages.length - 1] : 'Authentication failed';
        if (req.session?.messages) {
            req.session.messages = [];
        }
        const siteUrl = this.configService.get('siteUrl');
        res.redirect(`${siteUrl}/auth/sign-in-error?error=${encodeURIComponent(errorMessage)}`);
    }
    handleGoogleCallback(req, res) {
        if (!req.isAuthenticated()) {
            res.redirect('/api/v1/auth/error');
            return;
        }
        const siteUrl = this.configService.get('siteUrl');
        const url = req.session.returnTo || siteUrl;
        res.redirect(url);
    }
    handleFacebookLogin() { }
    handleFacebookCallback(req, res) {
        if (!req.isAuthenticated()) {
            res.redirect('/api/v1/auth/error');
            return;
        }
        const siteUrl = this.configService.get('siteUrl');
        const url = req.session.returnTo || siteUrl;
        res.redirect(url);
    }
    handleLogin(req) {
        if (!req.isAuthenticated() || !req.user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return req.user;
    }
    async handleSignup(req, signupBody) {
        try {
            const ip = (0, parseIpFromReq_1.parseIpFromReq)(req);
            const userAgent = req.get('User-Agent');
            const user = await this.authService.signUp(signupBody, ip, userAgent);
            return user;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error?.message || 'An error occurred during signup. Please try again or contact support if the problem persists.');
        }
    }
    requestEmailVerify(req) {
        if (!req.user.email) {
            throw new common_1.BadRequestException('No associated email found');
        }
        return this.authService.requestEmailVerify(req.user.email);
    }
    requestEmailVerifyByEmail(requestEmailVerifyDto) {
        return this.authService.requestEmailVerify(requestEmailVerifyDto.email, true);
    }
    async verifyEmail(verifyEmailBody, res) {
        await this.authService.verifyEmail(verifyEmailBody);
        res.redirect(`${this.configService.get('siteUrl')}/auth/verify-email-success`);
    }
    async verifyEmailOtp(verifyEmailOtpBody, req) {
        console.log(verifyEmailOtpBody);
        if (verifyEmailOtpBody.userLoggedIn) {
            return await this.authService.verifyEmailOtp(verifyEmailOtpBody);
        }
        else {
            try {
                const result = await this.authService.verifyEmailOtp(verifyEmailOtpBody);
                if (result.user) {
                    return new Promise((resolve, reject) => {
                        const userTokenData = (0, createUserTokenData_1.createUserTokenData)(result.user);
                        req.login(userTokenData, (err) => {
                            if (err) {
                                this.logger.error('Failed to log in user after email verification:', err);
                                return reject(new common_1.BadRequestException('Email verified but login failed. Please try logging in manually.'));
                            }
                            resolve(result.user);
                        });
                    });
                }
                return result;
            }
            catch (error) {
                return await this.authService.resetEmailOtp(verifyEmailOtpBody);
            }
        }
    }
    async forgotPassword(req, forgotPasswordBody) {
        if (req.isAuthenticated()) {
            throw new common_1.BadRequestException('You are already authenticated');
        }
        try {
            await this.authService.forgotPassword(forgotPasswordBody);
            return {
                message: 'If an account with that email exists, you will receive a password reset code shortly.',
            };
        }
        catch (error) {
            console.log(`Failed to reset password for email ${forgotPasswordBody.email} error: ${error}`);
            if (error?.response?.data?.message) {
                throw new common_1.BadRequestException(error.response.data.message);
            }
            if (error?.status === 400) {
                throw new common_1.BadRequestException(error.message || 'Invalid request data');
            }
            if (error?.message) {
                throw new common_1.InternalServerErrorException(error.message);
            }
            throw new common_1.InternalServerErrorException('Failed to reset password! Please make sure you entered a valid email and have a password setup.');
        }
    }
    async resetPassword(resetPasswordBody, req) {
        if (req.isAuthenticated()) {
            throw new common_1.BadRequestException('You are already authenticated');
        }
        return this.authService.resetPassword(resetPasswordBody);
    }
    async resetPasswordOtp(resetPasswordOtpBody, req) {
        if (req.isAuthenticated()) {
            throw new common_1.BadRequestException('You are already authenticated');
        }
        return this.authService.resetPasswordOtp(resetPasswordOtpBody);
    }
    async errorRedirect(req, res) {
        const message = req.session.messages?.[0];
        res.redirect(`${this.configService.get('siteUrl')}/auth/sign-in-error${message ? `?reason=${JSON.stringify(message)}` : ''}`);
    }
    async handleLogout(req, res) {
        req.logOut((err) => {
            if (err) {
                throw new common_1.InternalServerErrorException('Failed to log out.');
            }
            res.clearCookie('token');
            res.status(201).json(null);
        });
    }
    async getSession(req) {
        if (!req.isAuthenticated()) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        const tokenCookie = req.headers.cookie
            ?.split(';')
            .find(cookie => cookie.trim().startsWith('token='))
            ?.split('=')[1];
        if (!tokenCookie) {
            throw new common_1.UnauthorizedException('No session token found');
        }
        const decodedToken = decodeURIComponent(tokenCookie);
        return {
            sessionId: decodedToken,
            userId: req.user?.id,
            authenticated: true
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('google/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleGoogleConfig", null);
__decorate([
    (0, common_1.Get)('facebook/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleFacebookConfig", null);
__decorate([
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    (0, common_1.Get)('google'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleGoogleLogin", null);
__decorate([
    (0, common_1.Get)('error'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleAuthError", null);
__decorate([
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleGoogleCallback", null);
__decorate([
    (0, common_1.UseGuards)(facebook_oauth_guard_1.FacebookOAuthGuard),
    (0, common_1.Get)('facebook'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleFacebookLogin", null);
__decorate([
    (0, common_1.UseGuards)(facebook_oauth_guard_1.FacebookOAuthGuard),
    (0, common_1.Get)('facebook/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleFacebookCallback", null);
__decorate([
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    (0, common_1.UseGuards)(local_auth_guard_1.LocalAuthGuard),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "handleLogin", null);
__decorate([
    (0, serialize_interceptor_1.Serialize)(user_dto_1.UserDto),
    (0, common_1.Post)('sign-up'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, signup_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "handleSignup", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.Post)('request-verify-email-code'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestEmailVerify", null);
__decorate([
    (0, common_1.Post)('request-verify-email-code-by-email'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_email_verify_dto_1.RequestEmailVerifyDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestEmailVerifyByEmail", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_dto_1.VerifyEmailDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('verify-email-otp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_otp_dto_1.VerifyEmailOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmailOtp", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Patch)('reset-password-otp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_otp_dto_1.ResetPasswordOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPasswordOtp", null);
__decorate([
    (0, common_1.Get)('error'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "errorRedirect", null);
__decorate([
    (0, common_1.Post)('sign-out'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "handleLogout", null);
__decorate([
    (0, common_1.Get)('session'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getSession", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        authentication_service_1.AuthService])
], AuthController);
//# sourceMappingURL=authentication.controller.js.map