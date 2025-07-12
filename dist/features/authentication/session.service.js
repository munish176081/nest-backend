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
            db: 1,
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
    async updateSessionIfContainsUser(sessionKey, userId, user) {
        try {
            const sessionData = await this.redis.get(sessionKey);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.passport?.user?.id === userId) {
                    const updatedUserData = (0, createUserTokenData_1.createUserTokenData)(user);
                    session.passport.user = updatedUserData;
                    await this.redis.set(sessionKey, JSON.stringify(session));
                    console.log(`Updated session ${sessionKey} for user ${userId}`);
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