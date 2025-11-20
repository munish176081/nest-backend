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
exports.GmailAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const gmail_config_1 = require("../../config/gmail.config");
let GmailAuthController = class GmailAuthController {
    constructor(configService) {
        this.configService = configService;
    }
    auth() {
        const oauth2Client = (0, gmail_config_1.createGmailOAuth2Client)(this.configService);
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.send'],
            prompt: 'consent',
        });
        return { url };
    }
    async callback(code) {
        if (!code) {
            return { error: 'No authorization code provided' };
        }
        const oauth2Client = (0, gmail_config_1.createGmailOAuth2Client)(this.configService);
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('\n=== GMAIL TOKENS - SAVE THESE SECURELY ===');
            console.log('EMAIL_GMAIL_ACCESS_TOKEN=', tokens.access_token);
            console.log('EMAIL_GMAIL_REFRESH_TOKEN=', tokens.refresh_token);
            console.log('EMAIL_GMAIL_EXPIRY_DATE=', tokens.expiry_date);
            console.log('===========================================\n');
            return {
                success: true,
                message: 'Tokens received. Store them securely in your .env file.',
                tokens: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                },
            };
        }
        catch (error) {
            console.error('Error getting tokens:', error);
            return {
                success: false,
                error: error.message || 'Failed to get tokens',
            };
        }
    }
};
exports.GmailAuthController = GmailAuthController;
__decorate([
    (0, common_1.Get)('auth'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GmailAuthController.prototype, "auth", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GmailAuthController.prototype, "callback", null);
exports.GmailAuthController = GmailAuthController = __decorate([
    (0, common_1.Controller)('auth/gmail'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GmailAuthController);
//# sourceMappingURL=gmail-auth.controller.js.map