export class AuthConfig {
  // OTP Configuration Flags
  static readonly USE_OTP_FOR_EMAIL_VERIFICATION = true;
  static readonly USE_OTP_FOR_FORGOT_PASSWORD = true;
  
  // OTP Settings
  static readonly OTP_LENGTH = 5;
  static readonly OTP_EXPIRY_TIME = 300; // 5 minutes in seconds
  static readonly OTP_COOLDOWN_PERIOD = 60; // 1 minute cooldown between OTP requests
  
  // Token Settings (fallback)
  static readonly TOKEN_EXPIRY_TIME = 3600; // 1 hour in seconds
  static readonly TOKEN_COOLDOWN_PERIOD = 300; // 5 minutes cooldown between token requests
} 