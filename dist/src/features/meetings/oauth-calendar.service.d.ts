import { ConfigService } from '@nestjs/config';
import { UserCalendarTokensService } from './user-calendar-tokens.service';
export declare class OAuthCalendarService {
    private configService;
    private userCalendarTokensService;
    private oauth2Client;
    constructor(configService: ConfigService, userCalendarTokensService: UserCalendarTokensService);
    getAuthUrl(): string;
    getAccessToken(code: string): Promise<any>;
    createCalendarEventWithOAuth(accessToken: string, meeting: any, listing: any, buyerEmail: string, sellerEmail: string): Promise<any>;
    checkAvailability(accessToken: string, date: string, time: string, duration: number, timezone: string): Promise<boolean>;
    updateCalendarEvent(accessToken: string, eventId: string, updates: any): Promise<any>;
    deleteCalendarEvent(accessToken: string, eventId: string): Promise<void>;
    getCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<any>;
    testTokenValidity(accessToken: string): Promise<boolean>;
    refreshAccessToken(refreshToken: string): Promise<any>;
    executeWithTokenRefresh<T>(accessToken: string, refreshToken: string | undefined, operation: (token: string) => Promise<T>): Promise<T>;
    private updateStoredTokens;
    private markTokenAsInvalid;
    private shouldAttemptCalendarSync;
    private lastSyncAttempts;
}
