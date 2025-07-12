import { IsString, IsUUID, Matches } from 'class-validator';
import { passwordRegex } from './signup.dto';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @IsUUID()
  userId: string;

  @Matches(passwordRegex, {
    message:
      'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
  })
  @IsString()
  password: string;

  @IsString()
  confirmPassword: string;
}
