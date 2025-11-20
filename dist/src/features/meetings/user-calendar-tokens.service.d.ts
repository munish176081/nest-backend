import { Repository } from 'typeorm';
import { UserCalendarTokens } from './entities/user-calendar-tokens.entity';
export declare class UserCalendarTokensService {
    private userCalendarTokensRepository;
    constructor(userCalendarTokensRepository: Repository<UserCalendarTokens>);
    storeTokens(userId: string, accessToken: string, refreshToken?: string, expiryDate?: number, scope?: string[], calendarId?: string): Promise<UserCalendarTokens>;
    getTokens(userId: string): Promise<UserCalendarTokens | null>;
    getValidAccessToken(userId: string): Promise<string | null>;
    updateTokensAfterRefresh(userId: string, newAccessToken: string, newExpiryDate?: number): Promise<void>;
    findByRefreshToken(refreshToken: string): Promise<UserCalendarTokens | null>;
    markTokensAsInvalid(userId: string): Promise<void>;
    revokeAccess(userId: string): Promise<void>;
    hasActiveIntegration(userId: string): Promise<boolean>;
    getUsersWithActiveIntegration(): Promise<string[]>;
}
