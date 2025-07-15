import { IsString, IsNotEmpty, IsEmail, Length, MinLength } from 'class-validator';

export class ResetPasswordOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 5, { message: 'OTP must be exactly 5 digits' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
} 