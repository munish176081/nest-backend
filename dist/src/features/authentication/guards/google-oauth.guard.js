"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./auth.guard");
let GoogleOAuthGuard = class GoogleOAuthGuard extends (0, auth_guard_1.AuthGuard)('google') {
    async canActivate(context) {
        try {
            const activate = (await super.canActivate(context));
            const request = context.switchToHttp().getRequest();
            await super.logIn(request);
            return activate;
        }
        catch (err) {
            console.error(`Failed to login with google. err:`, err);
            console.error(`Error stack:`, err.stack);
            const request = context.switchToHttp().getRequest();
            if (request.session?.messages?.length > 0) {
                console.error('Session messages:', request.session.messages);
            }
            const response = context.switchToHttp().getResponse();
            const errorMessage = request.session?.messages?.length > 0
                ? request.session.messages[request.session.messages.length - 1]
                : 'Google OAuth authentication failed';
            response.redirect(`/api/v1/auth/error?reason=${encodeURIComponent(errorMessage)}`);
            return false;
        }
    }
};
exports.GoogleOAuthGuard = GoogleOAuthGuard;
exports.GoogleOAuthGuard = GoogleOAuthGuard = __decorate([
    (0, common_1.Injectable)()
], GoogleOAuthGuard);
//# sourceMappingURL=google-oauth.guard.js.map