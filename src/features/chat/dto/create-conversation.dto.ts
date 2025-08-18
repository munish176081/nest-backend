import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipantDto {
  @IsString()
  userId: string;

  @IsString()
  name: string;

  @IsString()
  avatar: string;

  @IsString()
  role: 'buyer' | 'seller' | 'admin';
}

export class CreateConversationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  conversationType?: 'direct' | 'listing' | 'support';
} 