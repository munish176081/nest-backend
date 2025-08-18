import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: {
    subject?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
  };
} 