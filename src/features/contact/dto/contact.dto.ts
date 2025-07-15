import { IsString, IsEmail, IsOptional } from 'class-validator';

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
} 