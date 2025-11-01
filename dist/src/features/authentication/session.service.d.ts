import { ConfigService } from '@nestjs/config';
import { User } from '../accounts/entities/account.entity';
export declare class SessionService {
    private readonly configService;
    private redis;
    constructor(configService: ConfigService);
    updateUserSession(userId: string, user: User): Promise<void>;
    invalidateUserSessions(userId: string): Promise<void>;
    refreshUserSession(userId: string, user: User): Promise<void>;
    getSession(sessionId: string): Promise<any>;
    verifySession(sessionId: string): Promise<any>;
    private updateSessionIfContainsUser;
    private sessionContainsUser;
}
