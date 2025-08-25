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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_facebook_1 = require("passport-facebook");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const authentication_service_1 = require("../authentication.service");
const createUserTokenData_1 = require("../../../helpers/createUserTokenData");
const parseIpFromReq_1 = require("../../../helpers/parseIpFromReq");
let FacebookStrategy = class FacebookStrategy extends (0, passport_1.PassportStrategy)(passport_facebook_1.Strategy, 'facebook') {
    constructor(authService, configService) {
        super({
            clientID: configService.getOrThrow('facebook.clientId'),
            clientSecret: configService.getOrThrow('facebook.clientSecret'),
            callbackURL: `${configService.getOrThrow('apiUrl')}/api/v1/auth/facebook/callback`,
            scope: ['email', 'public_profile'],
            state: true,
            passReqToCallback: true,
            profileFields: ['id', 'emails', 'gender', 'link', 'verified', 'name', 'picture'],
            timeout: parseInt(configService.get('oauthTimeout') || '30000', 10),
            proxy: false,
        });
        this.authService = authService;
        this.configService = configService;
    }
    async validate(req, accessToken, refreshToken, profile, done) {
        try {
            const email = this.getEmailFromProfile(profile);
            if (!email) {
                return done(null, false, { message: 'No verified email associated with Facebook account' });
            }
            const { firstName, lastName } = this.parseName(profile);
            const imageUrl = this.getProfileImage(profile);
            const account = await this.authService.createOrGetAccount({
                externalId: profile.id,
                provider: 'facebook',
                userData: {
                    email,
                    imageUrl,
                    ip: (0, parseIpFromReq_1.parseIpFromReq)(req),
                    firstName,
                    lastName,
                },
                raw: profile._json,
            });
            return done(null, (0, createUserTokenData_1.createUserTokenData)(account.user));
        }
        catch (error) {
            this.handleValidationError(error, done);
        }
    }
    getEmailFromProfile(profile) {
        return (profile?.emails?.[0]?.value ||
            profile?._json?.email ||
            null);
    }
    parseName(profile) {
        const nameParts = (profile?.displayName || profile?._json?.name || '').trim().split(/\s+/);
        return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
        };
    }
    getProfileImage(profile) {
        return (profile?._json?.picture?.data?.url ||
            profile?.photos?.[0]?.value ||
            undefined);
    }
    handleValidationError(error, done) {
        const errorMessage = error.response?.data?.message || error.message;
        if (error.status?.toString()?.startsWith('4')) {
            return done(null, false, {
                message: errorMessage || 'Authentication rejected due to invalid data',
            });
        }
        else {
            console.error('Facebook auth error:', error);
            return done(null, false, {
                message: errorMessage || 'Temporary authentication service disruption',
            });
        }
    }
};
exports.FacebookStrategy = FacebookStrategy;
exports.FacebookStrategy = FacebookStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [authentication_service_1.AuthService,
        config_1.ConfigService])
], FacebookStrategy);
//# sourceMappingURL=facebook.js.map