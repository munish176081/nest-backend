import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestEmailVerifyDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

