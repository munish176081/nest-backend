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
exports.LoggedInGuard = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../features/accounts/users.service");
const session_service_1 = require("../features/authentication/session.service");
let LoggedInGuard = class LoggedInGuard {
    constructor(sessionService, usersService) {
        this.sessionService = sessionService;
        this.usersService = usersService;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        if (!req.isAuthenticated() || !req.user)
            throw new common_1.UnauthorizedException('You are not logged in');
        try {
            const freshUser = await this.usersService.validateAndGetUser(req.user.email);
            await this.sessionService.refreshUserSession(freshUser.id, freshUser);
            req.user = {
                id: freshUser.id,
                email: freshUser.email,
                name: freshUser.name,
                username: freshUser.username,
                status: freshUser.status,
                imageUrl: freshUser.imageUrl,
                createdAt: freshUser.createdAt,
            };
        }
        catch (error) {
            console.error('Error refreshing user session:', error);
        }
        if (req.user.status === 'suspended')
            throw new common_1.UnauthorizedException('Your account is suspended');
        return true;
    }
};
exports.LoggedInGuard = LoggedInGuard;
exports.LoggedInGuard = LoggedInGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [session_service_1.SessionService,
        users_service_1.UsersService])
], LoggedInGuard);
//# sourceMappingURL=LoggedInGuard.js.map