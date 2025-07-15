import { IsString, IsNotEmpty, IsEmail, Length, IsBoolean } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 5, { message: 'OTP must be exactly 5 digits' })
  otp: string;

  @IsBoolean()
  @IsNotEmpty()
  userLoggedIn: string;
} 