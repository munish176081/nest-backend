import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @IsString()
  type: 'image' | 'file';

  @IsString()
  url: string;

  @IsString()
  name: string;

  size: number;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsString()
  messageType: 'text' | 'image' | 'file' | 'listing';

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  listingReference?: {
    listingId: string;
    title: string;
    price: number;
    image: string;
    location: string;
    breed?: string;
    fields?: Record<string, any>;
  };
} 