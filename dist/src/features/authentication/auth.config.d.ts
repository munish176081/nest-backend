export declare class AuthConfig {
    static readonly USE_OTP_FOR_EMAIL_VERIFICATION = true;
    static readonly USE_OTP_FOR_FORGOT_PASSWORD = true;
    static readonly OTP_LENGTH = 5;
    static readonly OTP_EXPIRY_TIME = 300;
    static readonly OTP_COOLDOWN_PERIOD = 60;
    static readonly TOKEN_EXPIRY_TIME = 3600;
    static readonly TOKEN_COOLDOWN_PERIOD = 300;
}
