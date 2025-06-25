# OTP System Implementation

This document explains the OTP (One-Time Password) system implemented in the Pups4Sale backend application.

## Overview

The OTP system provides secure verification for:
- Email verification during signup
- Password reset functionality
- Alternative to token-based verification

## Configuration

### AuthConfig Class
Located in `src/modules/auth/auth.config.ts`

```typescript
export class AuthConfig {
  // OTP Configuration Flags
  static readonly USE_OTP_FOR_EMAIL_VERIFICATION = true;
  static readonly USE_OTP_FOR_FORGOT_PASSWORD = true;
  
  // OTP Settings
  static readonly OTP_LENGTH = 6;
  static readonly OTP_EXPIRY_TIME = 300; // 5 minutes
  static readonly OTP_COOLDOWN_PERIOD = 60; // 1 minute
  
  // Token Settings (fallback)
  static readonly TOKEN_EXPIRY_TIME = 3600; // 1 hour
  static readonly TOKEN_COOLDOWN_PERIOD = 300; // 5 minutes
}
```

### Enabling/Disabling OTP
To switch between OTP and token-based verification:

```typescript
// For email verification
AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION = true; // Use OTP
AuthConfig.USE_OTP_FOR_EMAIL_VERIFICATION = false; // Use tokens

// For password reset
AuthConfig.USE_OTP_FOR_FORGOT_PASSWORD = true; // Use OTP
AuthConfig.USE_OTP_FOR_FORGOT_PASSWORD = false; // Use tokens
```

## Components

### 1. OtpService
**Location**: `src/modules/auth/otp.service.ts`

**Features**:
- OTP generation (6-digit numeric)
- Redis-based storage with expiry
- Cooldown management
- One-time use validation
- Automatic cleanup after validation

**Key Methods**:
```typescript
generateOtp(length?: number): string
storeOtp(key: string, otp: string, expirySeconds?: number): Promise<void>
validateOtp(key: string, providedOtp: string): Promise<boolean>
canRequestOtp(timeKey: string, cooldownSeconds?: number): Promise<boolean>
```

### 2. DTOs
- **VerifyEmailOtpDto**: For OTP-based email verification
- **ResetPasswordOtpDto**: For OTP-based password reset

## API Endpoints

### Email Verification

#### Request Email Verification Code
```http
POST /api/v1/auth/request-verify-email-code
Authorization: Bearer <token>
```

#### Verify Email with OTP
```http
POST /api/v1/auth/verify-email-otp
Content-Type: application/json

{
  "userId": "user-uuid",
  "otp": "123456"
}
```

#### Verify Email with Token (fallback)
```http
GET /api/v1/auth/verify-email?token=<token>&userId=<userId>
```

### Password Reset

#### Request Password Reset Code
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password with OTP
```http
PATCH /api/v1/auth/reset-password-otp
Content-Type: application/json

{
  "userId": "user-uuid",
  "otp": "123456",
  "password": "newpassword",
  "confirmPassword": "newpassword"
}
```

#### Reset Password with Token (fallback)
```http
PATCH /api/v1/auth/reset-password
Content-Type: application/json

{
  "userId": "user-uuid",
  "token": "reset-token",
  "password": "newpassword",
  "confirmPassword": "newpassword"
}
```

## Flow Diagrams

### Email Verification Flow
```
User Signup → Check Config → OTP Enabled? → Yes → Generate OTP → Send Email → User Enters OTP → Validate → Verify User
                                    ↓ No
                              Generate Token → Send Email → User Clicks Link → Validate → Verify User
```

### Password Reset Flow
```
User Requests Reset → Check Config → OTP Enabled? → Yes → Generate OTP → Send Email → User Enters OTP → Validate → Reset Password
                                    ↓ No
                              Generate Token → Send Email → User Clicks Link → Validate → Reset Password
```

## Security Features

### 1. OTP Expiry
- OTPs expire after 5 minutes (configurable)
- One-time use only
- Automatically deleted after validation

### 2. Cooldown Protection
- 1-minute cooldown between OTP requests
- Prevents spam and abuse
- Configurable cooldown periods

### 3. Rate Limiting
- Built-in cooldown checks
- Redis-based storage for distributed systems
- Automatic cleanup of expired OTPs

### 4. Validation
- 6-digit numeric OTPs
- Exact length validation
- Case-sensitive comparison

## Email Templates

The system uses existing SendGrid templates but passes different data:

### OTP Email Template Data
```typescript
{
  username: string,
  otp: string, // 6-digit code
  verificationUrl?: string // Optional for OTP
}
```

### Token Email Template Data
```typescript
{
  username: string,
  verificationUrl: string // Full URL with token
}
```

## Error Handling

### Common Error Responses

#### Invalid OTP
```json
{
  "statusCode": 401,
  "message": "Invalid or expired OTP"
}
```

#### Cooldown Active
```json
{
  "statusCode": 400,
  "message": "Please wait 45 seconds before requesting another verification code"
}
```

#### User Not Found
```json
{
  "statusCode": 400,
  "message": "User not found with this email"
}
```

## Migration Guide

### From Token to OTP
1. Set configuration flags to `true`
2. Update frontend to handle OTP input
3. Update email templates to include OTP
4. Test both flows

### From OTP to Token
1. Set configuration flags to `false`
2. Update frontend to handle token links
3. Update email templates to include verification URLs
4. Test both flows

## Testing

### Test Cases
1. **Valid OTP**: Should verify email/reset password
2. **Invalid OTP**: Should return error
3. **Expired OTP**: Should return error
4. **Reused OTP**: Should return error
5. **Cooldown**: Should prevent rapid requests
6. **Fallback**: Should work with tokens when OTP disabled

### Test Commands
```bash
# Test OTP generation
curl -X POST /api/v1/auth/request-verify-email-code

# Test OTP validation
curl -X POST /api/v1/auth/verify-email-otp -d '{"userId":"...","otp":"123456"}'

# Test password reset OTP
curl -X PATCH /api/v1/auth/reset-password-otp -d '{"userId":"...","otp":"123456","password":"...","confirmPassword":"..."}'
```

## Monitoring

### Redis Keys Pattern
- `email-verification-otp:{userId}` - OTP for email verification
- `email-verification-otp-time:{userId}` - Cooldown for email verification
- `reset-password-otp:{userId}` - OTP for password reset
- `reset-password-otp-time:{userId}` - Cooldown for password reset

### Logging
The system logs:
- OTP generation
- OTP validation attempts
- Cooldown violations
- Email sending status

## Best Practices

1. **Keep OTPs Short**: 6 digits is optimal for user experience
2. **Short Expiry**: 5 minutes balances security and usability
3. **Cooldown Protection**: Prevents abuse and spam
4. **One-time Use**: OTPs are deleted after validation
5. **Fallback Support**: Token system remains as backup
6. **Clear Error Messages**: Help users understand what went wrong

This OTP system provides a secure, user-friendly alternative to token-based verification while maintaining backward compatibility. 