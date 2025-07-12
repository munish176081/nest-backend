import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CompleteUploadDto {
  @IsString()
  uploadId: string;

  @IsString()
  fileName: string;

  @IsNumber()
  totalSize: number;

  @IsArray()
  @IsString({ each: true })
  chunkUrls: string[]; // URLs of uploaded chunks

  @IsOptional()
  @IsString()
  finalUrl?: string; // Final assembled file URL

  @IsOptional()
  @IsString()
  metadata?: string; // JSON string for additional metadata
} 