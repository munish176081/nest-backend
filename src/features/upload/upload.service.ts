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
    this.logger.log(`Requesting upload URL for: ${dto.fileName}`);
    this.logger.log(`User ID: ${userId}`);
    
    // Validate file type and size
    this.validateFileType(dto.mimeType, dto.fileType);
    this.validateFileSize(dto.fileSize, dto.fileType);

    // Check if this is a new upload or resuming
    let upload: Upload | null = null;
    let fileKey: string | undefined;
    
    if (dto.uploadId) {
      upload = await this.uploadRepository.findByUploadId(dto.uploadId);
      if (!upload) {
        throw new NotFoundException('Upload session not found');
      }
      fileKey = upload.fileKey;
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
      fileKey: fileKey, // Pass the stored file key if it exists
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    // Create or update upload record
    if (!upload) {
      this.logger.log(`Creating new upload record with user ID: ${userId}`);
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
        fileKey: signedUrlResponse.chunkKey, // Store the file key for future chunk uploads
        metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
      });
      this.logger.log(`Created upload record: ${upload.id} with file key: ${signedUrlResponse.chunkKey}`);
    } else {
      this.logger.log(`Updating existing upload record: ${upload.id}`);
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
    this.logger.log(`Completing upload: ${dto.uploadId}`);
    this.logger.log(`User ID: ${userId}`);
    
    // Find the upload record
    const upload = await this.uploadRepository.findByUploadId(dto.uploadId);
    if (!upload) {
      throw new NotFoundException('Upload session not found');
    }

    this.logger.log(`Found upload record: ${upload.id}, Current user: ${upload.userId}`);

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
      fileType: upload.fileType,
      finalUrl: dto.finalUrl,
      fileKey: upload.fileKey,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    this.logger.log(`Generated final URL: ${finalUrl}`);

    // Update the upload record
    await this.uploadRepository.updateByUploadId(dto.uploadId, {
      status: 'completed',
      finalUrl,
      chunkUrls: dto.chunkUrls,
      uploadedChunks: dto.chunkUrls.length,
    });

    this.logger.log(`Updated upload record with final URL: ${finalUrl}`);

    return {
      uploadId: dto.uploadId,
      finalUrl,
      status: 'completed',
    };
  }

  async getUserUploads(userId: string): Promise<Upload[]> {
    return await this.uploadRepository.findByUserId(userId);
  }

  async getAllUploads(): Promise<Upload[]> {
    return await this.uploadRepository.findAll();
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

  async deleteUploadByUrl(fileUrl: string, userId?: string): Promise<void> {
    this.logger.log(`Attempting to delete upload by URL: ${fileUrl}`);
    this.logger.log(`User ID: ${userId}`);
    
    // First, let's see all uploads for debugging
    const allUploads = await this.uploadRepository.findAll();
    this.logger.log(`Total uploads in database: ${allUploads.length}`);
    allUploads.forEach(upload => {
      this.logger.log(`Upload: ${upload.id} | URL: ${upload.finalUrl} | User: ${upload.userId || 'Anonymous'}`);
    });
    
    // Find upload by final URL
    let upload = await this.uploadRepository.findByFinalUrl(fileUrl);
    this.logger.log(`Exact URL match result: ${upload ? 'Found' : 'Not found'}`);
    
    // If exact match fails, try pattern matching
    if (!upload) {
      this.logger.log(`Exact URL match failed, trying pattern matching...`);
      const uploads = await this.uploadRepository.findByUrlPattern(fileUrl);
      this.logger.log(`Pattern matching found ${uploads.length} matches`);
      if (uploads.length > 0) {
        upload = uploads[0]; // Use the first match
        this.logger.log(`Found upload via pattern matching: ${upload.id}`);
      }
    }
    
    if (!upload) {
      this.logger.warn(`No upload record found for URL: ${fileUrl}`);
      this.logger.warn(`Available URLs in database:`);
      allUploads.forEach(u => {
        this.logger.warn(`  - ${u.finalUrl}`);
      });
      
      // Try to delete from R2 anyway, even if no database record exists
      try {
        await this.r2Service.deleteFile(fileUrl);
        this.logger.log(`Deleted file from R2 without database record: ${fileUrl}`);
        return;
      } catch (error) {
        this.logger.error(`Failed to delete file from R2: ${fileUrl}`, error);
        throw new NotFoundException('Upload not found for this URL');
      }
    }

    this.logger.log(`Found upload record: ${upload.id}, User ID: ${upload.userId}`);

    // Only check user ownership if both userId and upload.userId exist
    if (userId && upload.userId && upload.userId !== userId) {
      this.logger.warn(`User ${userId} attempted to delete upload ${upload.id} owned by ${upload.userId}`);
      throw new BadRequestException('You can only delete your own uploads');
    }

    // Delete from R2
    try {
      await this.r2Service.deleteFile(fileUrl);
      this.logger.log(`Deleted file from R2: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${fileUrl}`, error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database
    await this.uploadRepository.delete(upload.id);
    this.logger.log(`Deleted upload record: ${upload.id}`);

    this.logger.log(`Successfully deleted upload by URL: ${upload.fileName}`);
  }

  async deleteMultipleUploadsByUrls(fileUrls: string[], userId?: string): Promise<{
    success: string[];
    failed: { url: string; error: string }[];
  }> {
    this.logger.log(`Attempting to delete ${fileUrls.length} uploads`);
    this.logger.log(`User ID: ${userId}`);
    
    const results = {
      success: [] as string[],
      failed: [] as { url: string; error: string }[]
    };

    // Process each URL
    for (const fileUrl of fileUrls) {
      try {
        await this.deleteUploadByUrl(fileUrl, userId);
        results.success.push(fileUrl);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ url: fileUrl, error: errorMessage });
        this.logger.error(`Failed to delete ${fileUrl}: ${errorMessage}`);
      }
    }

    this.logger.log(`Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`);
    return results;
  }


  private validateFileType(mimeType: string, fileType: FileType): void {
    const allowedMimeTypes = {
      [FileType.IMAGE]: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
        'image/bmp', 'image/tiff', 'image/svg+xml'
      ],
      [FileType.VIDEO]: [
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
        'video/webm', 'video/mkv', 'video/3gp', 'video/ogg', 'video/m4v'
      ],
      [FileType.DOCUMENT]: [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain', // .txt
        'text/csv', // .csv
        'application/rtf', // .rtf
        // Audio file types for voice messages
        'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'
      ],
    };

    // Security: Block dangerous file types
    const blockedMimeTypes = [
      'application/x-executable', 'application/x-msdownload', 'application/x-msi',
      'application/x-shockwave-flash', 'application/x-sh', 'application/x-bat',
      'application/x-cmd', 'application/x-com', 'application/x-exe',
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
      'application/x-7z-compressed', 'application/x-tar', 'application/x-gzip',
      'text/html', 'text/javascript', 'application/javascript', 'application/x-javascript',
      'application/x-php', 'application/x-python', 'application/x-ruby',
      'application/x-perl', 'application/x-shellscript'
    ];

    // Extract base mime type (remove codec specifications like ;codecs=opus)
    const baseMimeType = mimeType.split(';')[0].trim();

    if (blockedMimeTypes.includes(baseMimeType)) {
      throw new BadRequestException(`File type not allowed for security reasons: ${mimeType}`);
    }

    const allowedTypes = allowedMimeTypes[fileType];
    if (!allowedTypes.includes(baseMimeType)) {
      throw new BadRequestException(`Invalid file type for ${fileType}: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  private validateFileSize(fileSize: number, fileType: FileType): void {
    const maxSizes = {
      [FileType.IMAGE]: 15 * 1024 * 1024, // 15MB - for high-res images
      [FileType.VIDEO]: 500 * 1024 * 1024, // 500MB - for longer videos
      [FileType.DOCUMENT]: 25 * 1024 * 1024, // 25MB - for large documents
    };

    const maxSize = maxSizes[fileType];
    if (fileSize > maxSize) {
      throw new BadRequestException(`File size exceeds maximum allowed for ${fileType}: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
  }
} 