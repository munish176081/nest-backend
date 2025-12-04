import { OAuthCalendarService } from './oauth-calendar.service';
import { UserCalendarTokensService } from './user-calendar-tokens.service';
export declare class OAuthCalendarController {
    private readonly oauthCalendarService;
    private readonly userCalendarTokensService;
    constructor(oauthCalendarService: OAuthCalendarService, userCalendarTokensService: UserCalendarTokensService);
    getAuthUrl(): {
        authUrl: string;
        message: string;
    };
    handleOAuthCallback(body: {
        code: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        tokens: {
            access_token: any;
            refresh_token: any;
            expiry_date: any;
        };
        instructions: {
            next_steps: string[];
        };
    }>;
    createCalendarEvent(body: {
        access_token: string;
        meeting: any;
        listing: any;
        buyer_email: string;
        seller_email: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        event: any;
        features_enabled: string[];
    }>;
    getUserTokens(req: any): Promise<{
        success: boolean;
        message: string;
        tokens: {
            access_token: string;
            refresh_token: string;
            expiry_date: number;
            scope: string[];
            calendar_id: string;
        };
    }>;
    refreshToken(body: {
        refresh_token: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        tokens: {
            access_token: any;
            expiry_date: any;
        };
    }>;
    testOAuthCalendar(body: {
        access_token: string;
    }): Promise<{
        success: boolean;
        message: string;
        test_result: any;
        note: string;
    }>;
}
