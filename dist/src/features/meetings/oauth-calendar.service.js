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
exports.OAuthCalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const config_1 = require("@nestjs/config");
const user_calendar_tokens_service_1 = require("./user-calendar-tokens.service");
let OAuthCalendarService = class OAuthCalendarService {
    constructor(configService, userCalendarTokensService) {
        this.configService = configService;
        this.userCalendarTokensService = userCalendarTokensService;
        this.lastSyncAttempts = new Map();
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    }
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            include_granted_scopes: true,
        });
    }
    async getAccessToken(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            return tokens;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to exchange authorization code');
        }
    }
    async createCalendarEventWithOAuth(accessToken, meeting, listing, buyerEmail, sellerEmail) {
        try {
            console.log('🔧 Creating fresh OAuth2Client for calendar event creation');
            const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
            console.log('🔧 Setting credentials with access token');
            oauth2Client.setCredentials({
                access_token: accessToken,
            });
            console.log('🔧 Creating calendar API client');
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            let userProfile = null;
            console.log('Skipping user profile fetch for debugging');
            const startDateTime = `${meeting.date}T${meeting.time}:00`;
            const start = new Date(startDateTime);
            const end = new Date(start.getTime() + meeting.duration * 60000);
            const event = {
                summary: `Puppy Viewing: ${listing.title}`,
                description: `
        Puppy Viewing Appointment
        
        Listing: ${listing.title}
        Duration: ${meeting.duration} minutes
        Meeting ID: ${meeting.id}
        
        Participants:
        - Buyer: ${buyerEmail}
        - Seller: ${sellerEmail}
        
        Notes:
        ${meeting.notes || 'No additional notes provided.'}
        
        About the Puppies:
        ${listing.description || 'Details about the puppies will be shared during the meeting.'}
        
        —
        Pups4Sale Team
        `,
                start: {
                    dateTime: start.toISOString(),
                    timeZone: meeting.timezone || 'Asia/Kolkata',
                },
                end: {
                    dateTime: end.toISOString(),
                    timeZone: meeting.timezone || 'Asia/Kolkata',
                },
                attendees: [
                    {
                        email: sellerEmail,
                        responseStatus: 'needsAction'
                    },
                    {
                        email: buyerEmail,
                        responseStatus: 'needsAction'
                    },
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${meeting.id}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                reminders: {
                    useDefault: true,
                }
            };
            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
                conferenceDataVersion: 1,
            });
            const createdEvent = response.data;
            let googleMeetLink = meeting.googleMeetLink;
            if (createdEvent.conferenceData?.entryPoints?.length) {
                googleMeetLink = createdEvent.conferenceData.entryPoints[0].uri;
            }
            return {
                eventId: createdEvent.id,
                htmlLink: createdEvent.htmlLink,
                googleMeetLink,
                attendees: createdEvent.attendees,
                status: createdEvent.status,
            };
        }
        catch (error) {
            console.error('Error creating OAuth calendar event:', error);
            if (error.response?.data?.error) {
                console.error('Google Calendar API Error Details:', {
                    message: error.response.data.error.message,
                    code: error.response.data.error.code,
                    errors: error.response.data.error.errors
                });
            }
            throw error;
        }
    }
    async checkAvailability(accessToken, date, time, duration, timezone) {
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
            oauth2Client.setCredentials({
                access_token: accessToken,
            });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const startDateTime = `${date}T${time}:00`;
            const start = new Date(startDateTime);
            const end = new Date(start.getTime() + duration * 60000);
            console.log(`🔍 Checking calendar availability from ${start.toISOString()} to ${end.toISOString()}`);
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });
            const events = response.data.items || [];
            const conflictingEvents = events.filter(event => {
                if (event.start?.date)
                    return false;
                if (event.attendees?.some(attendee => attendee.self && attendee.responseStatus === 'declined'))
                    return false;
                if (event.status === 'cancelled')
                    return false;
                return true;
            });
            if (conflictingEvents.length > 0) {
                console.log(`❌ Availability check failed - found ${conflictingEvents.length} conflicting events:`);
                conflictingEvents.forEach(event => {
                    console.log(`   - ${event.summary} (${event.start?.dateTime} - ${event.end?.dateTime})`);
                });
                return false;
            }
            console.log('✅ User is available at the requested time');
            return true;
        }
        catch (error) {
            console.error('Error checking calendar availability:', error);
            if (error.response?.status === 401) {
                console.log('🔑 Access token might be expired - availability check failed');
                return false;
            }
            console.log('⚠️ Assuming available due to calendar API error');
            return true;
        }
    }
    async updateCalendarEvent(accessToken, eventId, updates) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            requestBody: updates,
            sendUpdates: 'all',
        });
        return response.data;
    }
    async deleteCalendarEvent(accessToken, eventId) {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        oauth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
            sendUpdates: 'all',
        });
    }
    async getCalendarEvent(accessToken, calendarId, eventId) {
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
            oauth2Client.setCredentials({ access_token: accessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.events.get({
                calendarId: calendarId,
                eventId: eventId,
            });
            console.log(`📅 Calendar event retrieved: ${eventId}`);
            return response.data;
        }
        catch (error) {
            console.error(`❌ Error getting calendar event ${eventId}:`, error);
            return null;
        }
    }
    async testTokenValidity(accessToken) {
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
            oauth2Client.setCredentials({ access_token: accessToken });
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            console.log('Token validation successful for user:', userInfo.data.email);
            return true;
        }
        catch (error) {
            console.error('Token validation failed:', error.message);
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }
    async refreshAccessToken(refreshToken) {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        return credentials;
    }
    async executeWithTokenRefresh(accessToken, refreshToken, operation) {
        try {
            return await operation(accessToken);
        }
        catch (error) {
            if (error.response?.status === 401 && refreshToken) {
                console.log('🔑 Access token expired, attempting to refresh...');
                try {
                    const newTokens = await this.refreshAccessToken(refreshToken);
                    console.log('✅ Token refreshed successfully, retrying operation...');
                    await this.updateStoredTokens(refreshToken, newTokens);
                    return await operation(newTokens.access_token);
                }
                catch (refreshError) {
                    console.error('❌ Failed to refresh token:', refreshError);
                    await this.markTokenAsInvalid(refreshToken);
                    throw new Error('Access token expired and refresh failed. Please re-authorize.');
                }
            }
            throw error;
        }
    }
    async updateStoredTokens(oldRefreshToken, newTokens) {
        try {
            const userTokens = await this.userCalendarTokensService.findByRefreshToken(oldRefreshToken);
            if (userTokens) {
                await this.userCalendarTokensService.updateTokensAfterRefresh(userTokens.userId, newTokens.access_token, newTokens.expiry_date);
            }
        }
        catch (error) {
            console.error('Failed to update stored tokens:', error);
        }
    }
    async markTokenAsInvalid(refreshToken) {
        try {
            const userTokens = await this.userCalendarTokensService.findByRefreshToken(refreshToken);
            if (userTokens) {
                await this.userCalendarTokensService.markTokensAsInvalid(userTokens.userId);
            }
        }
        catch (error) {
            console.error('Failed to mark token as invalid:', error);
        }
    }
    shouldAttemptCalendarSync(userId) {
        const now = Date.now();
        const lastAttempt = this.lastSyncAttempts.get(userId) || 0;
        const minInterval = 5 * 60 * 1000;
        if (now - lastAttempt < minInterval) {
            return false;
        }
        this.lastSyncAttempts.set(userId, now);
        return true;
    }
};
exports.OAuthCalendarService = OAuthCalendarService;
exports.OAuthCalendarService = OAuthCalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        user_calendar_tokens_service_1.UserCalendarTokensService])
], OAuthCalendarService);
//# sourceMappingURL=oauth-calendar.service.js.map