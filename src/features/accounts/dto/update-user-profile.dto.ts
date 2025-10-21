import { IsOptional, IsString, IsEmail, MinLength, MaxLength, Matches, IsUrl, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IdVerificationDto {
  @IsArray()
  @IsString({ each: true })
  governmentId: string[];

  @IsArray()
  @IsString({ each: true })
  selfieWithId: string[];
}

export class UpdateUserProfileDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(256, { message: 'Name must be less than 256 characters' })
  @Matches(/^[a-zA-Z0-9 ]+$/, { message: 'Name must be alphanumeric and can include spaces only' })
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(256, { message: 'Username must be less than 256 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(512, { message: 'Image URL must be less than 512 characters' })
  imageUrl?: string;

  @IsString()
  @MinLength(1, { message: 'Phone is required' })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'Bio must be 250 characters or less' })
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid website URL' })
  website?: string;

  @IsString()
  @MinLength(1, { message: 'Business or Breeders name is required' })
  @MaxLength(256, { message: 'Business name must be less than 256 characters' })
  businessName: string;

  @IsString()
  @MinLength(1, { message: 'Business ABN is required' })
  @Matches(/^\d{11}$/, { message: 'ABN must be exactly 11 digits' })
  businessABN: string;

  @IsString()
  @MinLength(1, { message: 'Description is required' })
  @MaxLength(1000, { message: 'Description must be 1000 characters or less' })
  description: string;

  @IsString()
  @MinLength(1, { message: 'Location is required' })
  @MaxLength(256, { message: 'Location must be less than 256 characters' })
  location: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IdVerificationDto)
  idVerification?: IdVerificationDto;
}
