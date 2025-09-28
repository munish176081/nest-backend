import { IsOptional, IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(256, { message: 'Name must be less than 256 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(256, { message: 'Username must be less than 256 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512, { message: 'Image URL must be less than 512 characters' })
  imageUrl?: string;
}
