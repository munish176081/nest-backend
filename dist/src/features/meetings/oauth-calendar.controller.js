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
exports.OAuthCalendarController = void 0;
const common_1 = require("@nestjs/common");
const oauth_calendar_service_1 = require("./oauth-calendar.service");
const user_calendar_tokens_service_1 = require("./user-calendar-tokens.service");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let OAuthCalendarController = class OAuthCalendarController {
    constructor(oauthCalendarService, userCalendarTokensService) {
        this.oauthCalendarService = oauthCalendarService;
        this.userCalendarTokensService = userCalendarTokensService;
    }
    getAuthUrl() {
        const authUrl = this.oauthCalendarService.getAuthUrl();
        return {
            authUrl,
            message: 'Redirect user to this URL to authorize calendar access',
        };
    }
    async handleOAuthCallback(body, req) {
        const { code } = body;
        const userId = req.user?.id;
        if (!code) {
            throw new common_1.BadRequestException('Authorization code is required');
        }
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        try {
            const tokens = await this.oauthCalendarService.getAccessToken(code);
            await this.userCalendarTokensService.storeTokens(userId, tokens.access_token, tokens.refresh_token, tokens.expiry_date, tokens.scope, 'primary');
            return {
                success: true,
                message: 'Calendar access authorized and tokens stored successfully',
                tokens: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                },
                instructions: {
                    next_steps: [
                        'Tokens have been stored securely in the database',
                        'You can now create meetings with calendar integration',
                        'Access tokens will be refreshed automatically when needed'
                    ]
                }
            };
        }
        catch (error) {
            console.error('OAuth callback error:', error);
            throw new common_1.BadRequestException('Failed to authorize calendar access');
        }
    }
    async createCalendarEvent(body, req) {
        const { access_token, meeting, listing, buyer_email, seller_email } = body;
        if (!access_token) {
            throw new common_1.BadRequestException('Access token is required');
        }
        try {
            const result = await this.oauthCalendarService.createCalendarEventWithOAuth(access_token, meeting, listing, buyer_email, seller_email);
            return {
                success: true,
                message: 'Calendar event created successfully with full functionality',
                event: result,
                features_enabled: [
                    '✅ Attendees automatically invited',
                    '✅ Google Meet link generated',
                    '✅ Email notifications sent',
                    '✅ Event created in user\'s calendar',
                    '✅ Reminders configured'
                ]
            };
        }
        catch (error) {
            console.error('Calendar event creation failed:', error);
            throw new common_1.BadRequestException('Failed to create calendar event');
        }
    }
    async getUserTokens(req) {
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        try {
            const tokens = await this.userCalendarTokensService.getTokens(userId);
            if (!tokens) {
                return {
                    success: false,
                    message: 'No calendar tokens found',
                    tokens: null
                };
            }
            return {
                success: true,
                message: 'Calendar tokens retrieved successfully',
                tokens: {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    expiry_date: tokens.expiryDate,
                    scope: tokens.scope,
                    calendar_id: tokens.calendarId
                }
            };
        }
        catch (error) {
            console.error('Error getting user tokens:', error);
            throw new common_1.BadRequestException('Failed to retrieve calendar tokens');
        }
    }
    async refreshToken(body, req) {
        const { refresh_token } = body;
        const userId = req.user?.id;
        if (!refresh_token) {
            throw new common_1.BadRequestException('Refresh token is required');
        }
        if (!userId) {
            throw new common_1.BadRequestException('User not authenticated');
        }
        try {
            const newTokens = await this.oauthCalendarService.refreshAccessToken(refresh_token);
            await this.userCalendarTokensService.storeTokens(userId, newTokens.access_token, newTokens.refresh_token, newTokens.expiry_date);
            return {
                success: true,
                message: 'Access token refreshed successfully',
                tokens: {
                    access_token: newTokens.access_token,
                    expiry_date: newTokens.expiry_date,
                }
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to refresh access token');
        }
    }
    async testOAuthCalendar(body) {
        const { access_token } = body;
        if (!access_token) {
            throw new common_1.BadRequestException('Access token is required');
        }
        const testMeeting = {
            id: 'oauth-test-' + Date.now(),
            date: '2024-12-21',
            time: '15:00',
            duration: 45,
            timezone: 'Asia/Kolkata',
            notes: 'OAuth calendar integration test - this event will be deleted automatically'
        };
        const testListing = {
            title: 'OAuth Test - Golden Retriever Puppies',
            description: 'Testing OAuth calendar integration functionality'
        };
        try {
            const result = await this.oauthCalendarService.createCalendarEventWithOAuth(access_token, testMeeting, testListing, 'test-buyer@example.com', 'test-seller@example.com');
            setTimeout(async () => {
                try {
                    await this.oauthCalendarService.deleteCalendarEvent(access_token, result.eventId);
                    console.log('Test event cleaned up successfully');
                }
                catch (error) {
                    console.error('Failed to clean up test event:', error);
                }
            }, 5000);
            return {
                success: true,
                message: 'OAuth calendar integration test successful!',
                test_result: result,
                note: 'Test event will be automatically deleted in 5 seconds'
            };
        }
        catch (error) {
            console.error('OAuth test failed:', error);
            throw new common_1.BadRequestException('OAuth calendar test failed');
        }
    }
};
exports.OAuthCalendarController = OAuthCalendarController;
__decorate([
    (0, common_1.Get)('auth-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OAuthCalendarController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Post)('oauth-callback'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthCalendarController.prototype, "handleOAuthCallback", null);
__decorate([
    (0, common_1.Post)('create-event'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthCalendarController.prototype, "createCalendarEvent", null);
__decorate([
    (0, common_1.Get)('tokens'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthCalendarController.prototype, "getUserTokens", null);
__decorate([
    (0, common_1.Post)('refresh-token'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthCalendarController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('test-oauth'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OAuthCalendarController.prototype, "testOAuthCalendar", null);
exports.OAuthCalendarController = OAuthCalendarController = __decorate([
    (0, common_1.Controller)('calendar'),
    __metadata("design:paramtypes", [oauth_calendar_service_1.OAuthCalendarService,
        user_calendar_tokens_service_1.UserCalendarTokensService])
], OAuthCalendarController);
//# sourceMappingURL=oauth-calendar.controller.js.map