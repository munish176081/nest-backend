import { IsString, IsUrl } from 'class-validator';

export class DeleteUploadByUrlDto {
  @IsString()
  @IsUrl()
  fileUrl: string;
} 