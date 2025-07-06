import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { R2Service } from './r2.service';
import { UploadRepository } from './upload.repository';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { Upload } from './entities/upload.entity';
import { FileType } from './dto/request-upload-url.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly r2Service: R2Service,
    private readonly uploadRepository: UploadRepository,
  ) {}

  async requestUploadUrl(dto: RequestUploadUrlDto, userId?: string): Promise<{
    uploadUrl: string;
    uploadId: string;
    chunkKey: string;
    expiresAt: Date;
  }> {
    // Validate file type and size
    this.validateFileType(dto.mimeType, dto.fileType);
    this.validateFileSize(dto.fileSize, dto.fileType);

    // Check if this is a new upload or resuming
    let upload: Upload | null = null;
    if (dto.uploadId) {
      upload = await this.uploadRepository.findByUploadId(dto.uploadId);
      if (!upload) {
        throw new NotFoundException('Upload session not found');
      }
    }

    // Generate signed URL
    const signedUrlResponse = await this.r2Service.generateSignedUrl({
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      chunkIndex: dto.chunkIndex,
      totalChunks: dto.totalChunks,
      fileType: dto.fileType,
      uploadId: dto.uploadId,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    // Create or update upload record
    if (!upload) {
      upload = await this.uploadRepository.create({
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        fileType: dto.fileType,
        uploadId: signedUrlResponse.uploadId,
        totalChunks: dto.totalChunks,
        uploadedChunks: 0,
        status: 'uploading',
        userId,
        metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
      });
    } else {
      await this.uploadRepository.updateByUploadId(dto.uploadId, {
        status: 'uploading',
      });
    }

    this.logger.log(`Generated upload URL for chunk ${dto.chunkIndex} of ${dto.fileName}`);

    return signedUrlResponse;
  }

  async completeUpload(dto: CompleteUploadDto, userId?: string): Promise<{
    uploadId: string;
    finalUrl: string;
    status: string;
  }> {
    // Find the upload record
    const upload = await this.uploadRepository.findByUploadId(dto.uploadId);
    if (!upload) {
      throw new NotFoundException('Upload session not found');
    }

    // Validate that the user owns this upload (if userId is provided)
    if (userId && upload.userId !== userId) {
      throw new BadRequestException('You can only complete your own uploads');
    }

    // Complete the upload in R2
    const finalUrl = await this.r2Service.completeUpload({
      uploadId: dto.uploadId,
      fileName: dto.fileName,
      totalSize: dto.totalSize,
      chunkUrls: dto.chunkUrls,
      finalUrl: dto.finalUrl,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    // Update the upload record
    await this.uploadRepository.updateByUploadId(dto.uploadId, {
      status: 'completed',
      finalUrl,
      chunkUrls: dto.chunkUrls,
      uploadedChunks: dto.chunkUrls.length,
    });

    this.logger.log(`Completed upload: ${dto.fileName}`);

    return {
      uploadId: dto.uploadId,
      finalUrl,
      status: 'completed',
    };
  }

  async getUserUploads(userId: string): Promise<Upload[]> {
    return await this.uploadRepository.findByUserId(userId);
  }

  async deleteUpload(uploadId: string, userId?: string): Promise<void> {
    const upload = await this.uploadRepository.findByUploadId(uploadId);
    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    if (userId && upload.userId !== userId) {
      throw new BadRequestException('You can only delete your own uploads');
    }

    // Delete from R2 if final URL exists
    if (upload.finalUrl) {
      await this.r2Service.deleteFile(upload.finalUrl);
    }

    // Delete from database
    await this.uploadRepository.delete(upload.id);

    this.logger.log(`Deleted upload: ${upload.fileName}`);
  }

  private validateFileType(mimeType: string, fileType: FileType): void {
    const allowedMimeTypes = {
      [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      [FileType.VIDEO]: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      [FileType.DOCUMENT]: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };

    const allowedTypes = allowedMimeTypes[fileType];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException(`Invalid file type for ${fileType}: ${mimeType}`);
    }
  }

  private validateFileSize(fileSize: number, fileType: FileType): void {
    const maxSizes = {
      [FileType.IMAGE]: 10 * 1024 * 1024, // 10MB
      [FileType.VIDEO]: 100 * 1024 * 1024, // 100MB
      [FileType.DOCUMENT]: 50 * 1024 * 1024, // 50MB
    };

    const maxSize = maxSizes[fileType];
    if (fileSize > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed for ${fileType}: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
  }
} 