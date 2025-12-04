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
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const config_1 = require("@nestjs/config");
const authentication_service_1 = require("../authentication.service");
const parseIpFromReq_1 = require("../../../helpers/parseIpFromReq");
const createUserTokenData_1 = require("../../../helpers/createUserTokenData");
let GoogleStrategy = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    constructor(authService, configService) {
        super({
            clientID: configService.get('google.clientId'),
            clientSecret: configService.get('google.clientSecret'),
            callbackURL: `${configService.get('apiUrl')}/api/v1/auth/google/callback`,
            scope: ['profile', 'email'],
            state: true,
            passReqToCallback: true,
        });
        this.authService = authService;
        this.configService = configService;
        console.log(configService.get('google.clientId'));
    }
    async validate(req, _accessToken, _refreshToken, profile, done) {
        const email = profile._json.email;
        if (!email) {
            done(null, false, { message: 'Email not provided by Google' });
            return;
        }
        try {
            console.log('Google profile:', {
                id: profile.id,
                email: profile._json.email,
                name: profile._json.name,
                given_name: profile._json.given_name,
                family_name: profile._json.family_name,
                picture: profile._json.picture,
            });
            const account = await this.authService.createOrGetAccount({
                externalId: profile.id,
                provider: 'google',
                userData: {
                    email,
                    imageUrl: profile._json.picture,
                    ip: (0, parseIpFromReq_1.parseIpFromReq)(req),
                    firstName: profile._json.given_name,
                    lastName: profile._json.family_name,
                },
                raw: profile._json,
            });
            console.log('Account created/retrieved:', account);
            console.log('User data:', account.user);
            done(null, (0, createUserTokenData_1.createUserTokenData)(account.user));
        }
        catch (err) {
            let message = 'Something went wrong';
            if (err.status?.toString()?.startsWith('4') && err.message) {
                message = err.message;
            }
            done(null, false, { message });
        }
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [authentication_service_1.AuthService,
        config_1.ConfigService])
], GoogleStrategy);
//# sourceMappingURL=google.js.map