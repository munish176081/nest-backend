import { IsAlphanumeric, IsEmail, IsString, Matches } from 'class-validator';

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export class SignupDto {
  @IsEmail()
  email: string;

  @IsAlphanumeric()
  @IsString()
  username: string;

  @Matches(passwordRegex, {
    message:
      'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
  })
  @IsString()
  password: string;

  @IsString()
  confirmPassword: string;
}
