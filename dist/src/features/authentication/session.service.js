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
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const createUserTokenData_1 = require("../../helpers/createUserTokenData");
let SessionService = class SessionService {
    constructor(configService) {
        this.configService = configService;
        this.redis = new ioredis_1.Redis(this.configService.get('redis.url'), {
            db: 0,
            ...(this.configService.get('cloudProvider') === 'heroku' && {
                tls: {
                    rejectUnauthorized: false,
                },
            }),
        });
    }
    async updateUserSession(userId, user) {
        try {
            let cursor = '0';
            const pattern = 'sess:*';
            do {
                const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
                cursor = newCursor;
                for (const sessionKey of keys) {
                    await this.updateSessionIfContainsUser(sessionKey, userId, user);
                }
            } while (cursor !== '0');
        }
        catch (error) {
            console.error('Error updating user session:', error);
        }
    }
    async invalidateUserSessions(userId) {
        try {
            let cursor = '0';
            const pattern = 'sess:*';
            const sessionsToDelete = [];
            do {
                const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
                cursor = newCursor;
                for (const sessionKey of keys) {
                    const containsUser = await this.sessionContainsUser(sessionKey, userId);
                    if (containsUser) {
                        sessionsToDelete.push(sessionKey);
                    }
                }
            } while (cursor !== '0');
            if (sessionsToDelete.length > 0) {
                await this.redis.del(...sessionsToDelete);
                console.log(`Invalidated ${sessionsToDelete.length} sessions for user ${userId}`);
            }
        }
        catch (error) {
            console.error('Error invalidating user sessions:', error);
        }
    }
    async refreshUserSession(userId, user) {
        await this.updateUserSession(userId, user);
    }
    async getSession(sessionId) {
        try {
            console.log('SessionService: Original sessionId received:', sessionId);
            console.log('SessionService: Session ID type:', typeof sessionId);
            console.log('SessionService: Session ID length:', sessionId?.length);
            let decodedSessionId = sessionId;
            try {
                if (sessionId && typeof sessionId === 'string') {
                    decodedSessionId = decodeURIComponent(sessionId);
                    if (decodedSessionId !== sessionId) {
                        console.log('SessionService: SessionId was URL encoded, decoded to:', decodedSessionId);
                    }
                }
            }
            catch (decodeError) {
                console.log('SessionService: Could not decode sessionId, using as-is');
                decodedSessionId = sessionId;
            }
            let sessionKeys = [];
            sessionKeys.push(`sess:${decodedSessionId}`);
            if (decodedSessionId && decodedSessionId.startsWith('s:')) {
                sessionKeys.push(`sess:${decodedSessionId.substring(2)}`);
            }
            if (decodedSessionId && decodedSessionId.includes('.')) {
                const beforeDot = decodedSessionId.split('.')[0];
                sessionKeys.push(`sess:${beforeDot}`);
            }
            if (decodedSessionId && decodedSessionId.startsWith('s:') && decodedSessionId.includes('.')) {
                const withoutPrefix = decodedSessionId.substring(2);
                const beforeDot = withoutPrefix.split('.')[0];
                sessionKeys.push(`sess:${beforeDot}`);
            }
            if (decodedSessionId && !decodedSessionId.startsWith('sess:')) {
                sessionKeys.push(`sess:${decodedSessionId}`);
            }
            if (decodedSessionId && decodedSessionId.startsWith('sess:')) {
                sessionKeys.push(decodedSessionId);
            }
            if (decodedSessionId && !decodedSessionId.startsWith('sess:')) {
                sessionKeys.push(decodedSessionId);
            }
            console.log('SessionService: Trying session keys:', sessionKeys);
            for (const sessionKey of sessionKeys) {
                console.log('SessionService: Trying Redis key:', sessionKey);
                const sessionData = await this.redis.get(sessionKey);
                if (sessionData) {
                    console.log('SessionService: Found session data with key:', sessionKey);
                    const session = JSON.parse(sessionData);
                    console.log('SessionService: Parsed session:', session);
                    return session;
                }
            }
            const allSessionKeys = await this.redis.keys('sess:*');
            console.log('SessionService: All available session keys in Redis:', allSessionKeys.slice(0, 10));
            if (decodedSessionId) {
                const matchingKeys = allSessionKeys.filter(key => key.includes(decodedSessionId) ||
                    key.includes(decodedSessionId.replace('s:', '')) ||
                    key.includes(decodedSessionId.split('.')[0]));
                console.log('SessionService: Potentially matching keys:', matchingKeys);
            }
            console.log('SessionService: No session data found in Redis');
            return null;
        }
        catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }
    async verifySession(sessionId) {
        try {
            console.log('SessionService: Verifying session ID:', sessionId);
            console.log('SessionService: Session ID type:', typeof sessionId);
            console.log('SessionService: Session ID length:', sessionId?.length);
            const session = await this.getSession(sessionId);
            console.log('SessionService: Raw session data:', session.passport.user);
            if (session && session.passport?.user) {
                return session.passport.user;
            }
            console.log('SessionService: No valid user found in session');
            return null;
        }
        catch (error) {
            console.error('Error verifying session:', error);
            return null;
        }
    }
    async updateSessionIfContainsUser(sessionKey, userId, user) {
        try {
            const sessionData = await this.redis.get(sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.passport?.user?.id === userId) {
                    const updatedUserData = (0, createUserTokenData_1.createUserTokenData)(user);
                    session.passport.user = updatedUserData;
                    await this.redis.set(sessionKey, JSON.stringify(session));
                }
            }
        }
        catch (parseError) {
            console.warn(`Failed to parse session ${sessionKey}:`, parseError);
        }
    }
    async sessionContainsUser(sessionKey, userId) {
        try {
            const sessionData = await this.redis.get(sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                return session.passport?.user?.id === userId;
            }
        }
        catch (parseError) {
            console.warn(`Failed to parse session ${sessionKey}:`, parseError);
        }
        return false;
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SessionService);
//# sourceMappingURL=session.service.js.map