"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrepareLoginMiddleware = void 0;
const common_1 = require("@nestjs/common");
const is_valid_url_to_return_1 = require("./utils/is-valid-url-to-return");
let PrepareLoginMiddleware = class PrepareLoginMiddleware {
    async use(req, _res, next) {
        req.logOut(() => {
            if (req.headers.referer && (0, is_valid_url_to_return_1.isAllowedUrlToReturn)(req.headers.referer)) {
                req.session.returnTo = req.headers.referer;
            }
            next();
        });
    }
};
exports.PrepareLoginMiddleware = PrepareLoginMiddleware;
exports.PrepareLoginMiddleware = PrepareLoginMiddleware = __decorate([
    (0, common_1.Injectable)()
], PrepareLoginMiddleware);
//# sourceMappingURL=prepare-login.middleware.js.map