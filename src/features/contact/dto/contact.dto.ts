import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class ContactDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message: string;

  @IsString()
  @IsNotEmpty({ message: "Please complete the reCAPTCHA verification." })
  recaptchaToken: string;
} 