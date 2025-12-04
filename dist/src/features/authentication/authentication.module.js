"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const google_1 = require("./providers/google");
const facebook_1 = require("./providers/facebook");
const local_1 = require("./providers/local");
const typeorm_1 = require("@nestjs/typeorm");
const external_auth_accounts_entity_1 = require("./entities/external-auth-accounts.entity");
const passport_serializer_1 = require("./utils/passport-serializer");
const passport_1 = require("@nestjs/passport");
const prepare_login_middleware_1 = require("./prepare-login.middleware");
const email_module_1 = require("../email/email.module");
const session_service_1 = require("./session.service");
const otp_service_1 = require("./otp.service");
const users_module_1 = require("../accounts/users.module");
const authentication_controller_1 = require("./authentication.controller");
const authentication_service_1 = require("./authentication.service");
const common_module_1 = require("../../common/common.module");
let AuthModule = class AuthModule {
    configure(consumer) {
        consumer
            .apply(prepare_login_middleware_1.PrepareLoginMiddleware)
            .forRoutes('/auth/google$', '/auth/facebook$', '/auth/login$');
    }
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ session: true, keepSessionInfo: true }),
            typeorm_1.TypeOrmModule.forFeature([external_auth_accounts_entity_1.ExternalAuthAccount]),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            email_module_1.EmailModule,
            common_module_1.CommonModule,
        ],
        controllers: [authentication_controller_1.AuthController],
        providers: [
            authentication_service_1.AuthService,
            google_1.GoogleStrategy,
            facebook_1.FacebookStrategy,
            local_1.LocalStrategy,
            passport_serializer_1.SessionSerializer,
            session_service_1.SessionService,
            otp_service_1.OtpService,
        ],
        exports: [authentication_service_1.AuthService, session_service_1.SessionService, otp_service_1.OtpService],
    })
], AuthModule);
//# sourceMappingURL=authentication.module.js.map