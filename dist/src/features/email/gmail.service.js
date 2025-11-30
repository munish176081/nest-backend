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
var GmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const gmail_config_1 = require("../../config/gmail.config");
let GmailService = GmailService_1 = class GmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GmailService_1.name);
        this.oauth2Client = (0, gmail_config_1.createGmailOAuth2Client)(this.configService);
        const accessToken = this.configService.get('gmail.accessToken') ||
            process.env.EMAIL_GMAIL_ACCESS_TOKEN;
        const refreshToken = this.configService.get('gmail.refreshToken') ||
            process.env.EMAIL_GMAIL_REFRESH_TOKEN;
        const expiryDate = this.configService.get('gmail.expiryDate') ||
            process.env.EMAIL_GMAIL_EXPIRY_DATE;
        if (refreshToken) {
            this.oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken,
                expiry_date: expiryDate ? parseInt(expiryDate.toString(), 10) : undefined,
            });
            this.logger.log('Gmail OAuth credentials loaded successfully.');
        }
        else {
            this.logger.warn('Gmail refresh token not configured. Email sending will fail. ' +
                'Visit /api/v1/auth/gmail/auth to obtain tokens and add EMAIL_GMAIL_REFRESH_TOKEN to your .env file.');
        }
    }
    hasCredentials() {
        const credentials = this.oauth2Client.credentials;
        return !!(credentials?.refresh_token || credentials?.access_token);
    }
    async ensureValidToken() {
        if (!this.hasCredentials()) {
            throw new Error('Gmail OAuth credentials not configured. Please visit /api/v1/auth/gmail/auth to obtain tokens and add EMAIL_GMAIL_REFRESH_TOKEN to your .env file.');
        }
        try {
            const expiryDate = this.oauth2Client.credentials.expiry_date;
            if (expiryDate && expiryDate < Date.now() + 5 * 60 * 1000) {
                this.logger.log('Access token expired or expiring soon, refreshing...');
                const newTokens = await this.oauth2Client.getAccessToken();
                if (newTokens.token) {
                    this.oauth2Client.setCredentials({
                        ...this.oauth2Client.credentials,
                        access_token: newTokens.token,
                    });
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to refresh access token:', error);
            throw new Error('Failed to refresh Gmail access token. Please re-authenticate.');
        }
    }
    async getUserEmail() {
        try {
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth: this.oauth2Client });
            const profile = await gmail.users.getProfile({ userId: 'me' });
            return profile.data.emailAddress || '';
        }
        catch (error) {
            this.logger.warn('Failed to get user email from Gmail profile, using fallback');
            return '';
        }
    }
    async sendMail(to, subject, html, from) {
        try {
            await this.ensureValidToken();
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth: this.oauth2Client });
            let senderEmail = from;
            if (!senderEmail) {
                senderEmail = await this.getUserEmail();
            }
            const emailMatch = senderEmail?.match(/<(.+)>/);
            const emailAddress = emailMatch ? emailMatch[1] : senderEmail;
            const fromName = this.configService.get('gmail.fromName') || 'pups4sale';
            const fromHeader = emailAddress ? `${fromName} <${emailAddress}>` : fromName;
            const FromName = process.env.SITE_NAME;
            const FromEmail = process.env.ADMIN_SUPPORT_EMAIL;
            const fromHeaderPart = `${FromName} <${FromEmail}>`;
            const messageParts = [
                `From: ${fromHeaderPart}`,
                `To: ${to}`,
                `Subject: ${subject}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                '',
                html,
            ];
            const message = messageParts.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: encodedMessage },
            });
            this.logger.log(`Email sent successfully to ${to} via Gmail API`);
            return { success: true };
        }
        catch (error) {
            const errorMessage = error?.message || 'Unknown error';
            const errorCode = error?.code || error?.status || 500;
            this.logger.error(`Failed to send email to ${to}: ${errorMessage}`, error?.stack);
            if (error?.code === 401 || error?.message?.includes('Invalid Credentials')) {
                return {
                    success: false,
                    error: 'Gmail authentication failed. Please re-authenticate.',
                    errorCode: 401,
                };
            }
            return {
                success: false,
                error: errorMessage,
                errorCode,
            };
        }
    }
};
exports.GmailService = GmailService;
exports.GmailService = GmailService = GmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GmailService);
//# sourceMappingURL=gmail.service.js.map