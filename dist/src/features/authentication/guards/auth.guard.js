"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const CustomAuthGuard = (type) => {
    return class Auth extends (0, passport_1.AuthGuard)(type) {
        handleRequest(err, user, info, context) {
            if (err) {
                throw err;
            }
            if (!user) {
                if (info) {
                    const msg = info.message || info;
                    const req = context.switchToHttp().getRequest();
                    req.session.messages = req.session.messages || [];
                    if (!req.session.messages.includes(msg))
                        req.session.messages.push(msg);
                }
                throw new common_1.UnauthorizedException();
            }
            return user;
        }
    };
};
exports.AuthGuard = CustomAuthGuard;
//# sourceMappingURL=auth.guard.js.map