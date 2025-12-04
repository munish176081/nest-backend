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
        if (!req.isAuthenticated() || !req.user) {
            const sessionUser = req.session?.passport?.user || req.session?.user;
            if (sessionUser && sessionUser.id) {
                req.user = sessionUser;
            }
            else {
                console.error('User not authenticated:', {
                    isAuthenticated: req.isAuthenticated(),
                    hasUser: !!req.user,
                    hasSessionUser: !!sessionUser,
                    sessionKeys: req.session ? Object.keys(req.session) : [],
                });
                throw new common_1.UnauthorizedException('You are not logged in');
            }
        }
        let userId = req.user.id;
        if (!userId) {
            userId = req.session?.passport?.user?.id || req.session?.user?.id;
            if (userId) {
                req.user.id = userId;
            }
        }
        if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || String(userId).trim() === '') {
            console.error('User session missing id property:', {
                reqUser: req.user,
                sessionPassportUser: req.session?.passport?.user,
                sessionUser: req.session?.user,
                userId,
            });
            throw new common_1.UnauthorizedException('Invalid user session. Please log in again.');
        }
        try {
            if (!req.user.email) {
                throw new Error('User email is missing');
            }
            const freshUser = await this.usersService.validateAndGetUser(req.user.email);
            if (!freshUser || !freshUser.id) {
                console.error('Fresh user data is invalid:', { freshUser });
                throw new Error('User data is invalid');
            }
            await this.sessionService.refreshUserSession(freshUser.id, freshUser);
            req.user = {
                id: freshUser.id,
                email: freshUser.email,
                name: freshUser.name,
                username: freshUser.username,
                status: freshUser.status,
                imageUrl: freshUser.imageUrl,
                createdAt: freshUser.createdAt,
                role: freshUser.role,
                isSuperAdmin: freshUser.isSuperAdmin,
            };
            if (req.session?.passport) {
                req.session.passport.user = req.user;
            }
            if (req.session) {
                req.session.user = req.user;
            }
        }
        catch (error) {
            console.error('Error refreshing user session:', error);
            const existingUserId = req.user.id || req.session?.passport?.user?.id || req.session?.user?.id;
            if (!existingUserId || existingUserId === null || existingUserId === undefined) {
                console.error('No valid userId found after session refresh error:', {
                    reqUserId: req.user.id,
                    sessionPassportUserId: req.session?.passport?.user?.id,
                    sessionUserId: req.session?.user?.id,
                });
                throw new common_1.UnauthorizedException('User session is invalid. Please log in again.');
            }
            if (!req.user.id && existingUserId) {
                req.user.id = existingUserId;
            }
        }
        const finalUserId = req.user.id;
        if (!finalUserId || finalUserId === null || finalUserId === undefined || finalUserId === 'null' || finalUserId === 'undefined' || String(finalUserId).trim() === '') {
            console.error('LoggedInGuard: Final check failed - invalid userId', {
                userId: finalUserId,
                userIdType: typeof finalUserId,
                userEmail: req.user.email,
                userObject: JSON.stringify(req.user),
            });
            throw new common_1.UnauthorizedException('User ID is missing or invalid. Please log in again.');
        }
        req.validatedUserId = finalUserId;
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