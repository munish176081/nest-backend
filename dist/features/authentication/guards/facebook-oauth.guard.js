"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookOAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./auth.guard");
let FacebookOAuthGuard = class FacebookOAuthGuard extends (0, auth_guard_1.AuthGuard)('facebook') {
    async canActivate(context) {
        try {
            const activate = (await super.canActivate(context));
            const request = context.switchToHttp().getRequest();
            await super.logIn(request);
            return activate;
        }
        catch (err) {
            console.error(`Failed to login with facebook. err:`, err);
            console.error(`Error stack:`, err.stack);
            if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
                console.error('Facebook OAuth timeout error:', err.message);
                const response = context.switchToHttp().getResponse();
                response.redirect('/api/v1/auth/error?reason=Facebook+OAuth+timeout.+Please+try+again.');
                return false;
            }
            if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
                console.error('Facebook OAuth network error:', err.message);
                const response = context.switchToHttp().getResponse();
                response.redirect('/api/v1/auth/error?reason=Network+error.+Please+check+your+connection+and+try+again.');
                return false;
            }
            const request = context.switchToHttp().getRequest();
            if (request.session?.messages?.length > 0) {
                console.error('Session messages:', request.session.messages);
            }
            const response = context.switchToHttp().getResponse();
            const errorMessage = request.session?.messages?.length > 0
                ? request.session.messages[request.session.messages.length - 1]
                : 'Facebook OAuth authentication failed';
            response.redirect(`/api/v1/auth/error?reason=${encodeURIComponent(errorMessage)}`);
            return false;
        }
    }
};
exports.FacebookOAuthGuard = FacebookOAuthGuard;
exports.FacebookOAuthGuard = FacebookOAuthGuard = __decorate([
    (0, common_1.Injectable)()
], FacebookOAuthGuard);
//# sourceMappingURL=facebook-oauth.guard.js.map