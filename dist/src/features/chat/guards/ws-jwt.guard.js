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
var WsJwtGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const users_service_1 = require("../../accounts/users.service");
const session_service_1 = require("../../authentication/session.service");
const common_2 = require("@nestjs/common");
let WsJwtGuard = WsJwtGuard_1 = class WsJwtGuard {
    constructor(usersService, sessionService) {
        this.usersService = usersService;
        this.sessionService = sessionService;
        this.logger = new common_2.Logger(WsJwtGuard_1.name);
    }
    async canActivate(context) {
        try {
            const client = context.switchToWs().getClient();
            const sessionId = this.extractSessionId(client);
            if (!sessionId) {
                throw new websockets_1.WsException('Session ID not provided');
            }
            const user = await this.verifySession(sessionId);
            if (!user) {
                throw new websockets_1.WsException('Invalid session');
            }
            client.userId = user.id;
            client.user = user;
            return true;
        }
        catch (error) {
            this.logger.error('WebSocket authentication failed:', error);
            throw new websockets_1.WsException('Authentication failed');
        }
    }
    extractSessionId(client) {
        if (client.handshake.auth?.sessionId) {
            return client.handshake.auth.sessionId;
        }
        if (client.handshake.headers?.sessionid) {
            return client.handshake.headers.sessionid;
        }
        if (client.handshake.headers?.cookie) {
            const cookies = client.handshake.headers.cookie;
            const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
            if (sessionMatch) {
                return sessionMatch[1];
            }
        }
        return null;
    }
    async verifySession(sessionId) {
        try {
            if (sessionId.startsWith('user:')) {
                const userId = sessionId.replace('user:', '');
                const user = await this.usersService.getUserById(userId);
                return user;
            }
            return null;
        }
        catch (error) {
            this.logger.error('Session verification failed:', error);
            return null;
        }
    }
};
exports.WsJwtGuard = WsJwtGuard;
exports.WsJwtGuard = WsJwtGuard = WsJwtGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        session_service_1.SessionService])
], WsJwtGuard);
//# sourceMappingURL=ws-jwt.guard.js.map