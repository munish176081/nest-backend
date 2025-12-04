"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthConfig = void 0;
class AuthConfig {
}
exports.AuthConfig = AuthConfig;
AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION = true;
AuthConfig.USE_OTP_FOR_FORGOT_PASSWORD = true;
AuthConfig.OTP_LENGTH = 5;
AuthConfig.OTP_EXPIRY_TIME = 300;
AuthConfig.OTP_COOLDOWN_PERIOD = 60;
AuthConfig.TOKEN_EXPIRY_TIME = 3600;
AuthConfig.TOKEN_COOLDOWN_PERIOD = 300;
//# sourceMappingURL=auth.config.js.map