export declare class UserCalendarTokens {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
    scope?: string[];
    isActive: boolean;
    calendarId?: string;
    createdAt: Date;
    updatedAt: Date;
    isTokenExpired(): boolean;
    hasCalendarScopes(): boolean;
}
