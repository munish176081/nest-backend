import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export class RequestUploadUrlDto {
  @IsString()
  fileName: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max file size
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(0)
  chunkIndex: number;

  @IsNumber()
  @Min(1)
  totalChunks: number;

  @IsEnum(FileType)
  fileType: FileType;

  @IsOptional()
  @IsString()
  uploadId?: string; // For resuming uploads

  @IsOptional()
  @IsString()
  metadata?: string; // JSON string for additional metadata
} 