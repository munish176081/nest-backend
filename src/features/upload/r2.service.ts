import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { IR2Service, IUploadRequest, ISignedUrlResponse, ICompleteUploadRequest } from './interfaces/r2.interface';

@Injectable()
export class R2Service implements IR2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    this.region = this.configService.get<string>('R2_REGION', 'auto');

    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.logger.log('R2 Configuration:', {
      bucketName: this.bucketName,
      region: this.region,
      endpoint: endpoint,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
    });

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn('R2 configuration is incomplete. Upload functionality may not work properly.');
    }

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint,
      forcePathStyle: true, 
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async generateSignedUrl(request: IUploadRequest): Promise<ISignedUrlResponse> {
    const uploadId = request.uploadId || uuidv4();
    
    // Use the provided file key or generate a new one
    const fileKey = request.fileKey || this.generateUniqueFileKey(request.fileName, uploadId, request.fileType);
    
    this.logger.log(`Generating signed URL with file key: ${fileKey} (provided: ${!!request.fileKey})`);
    
    // For multipart uploads (more than 1 chunk), use UploadPartCommand
    // For single chunk uploads, use PutObjectCommand
    if (request.totalChunks > 1) {
      // This is a multipart upload - we need to create multipart upload if it's the first chunk
      // and use UploadPartCommand for subsequent chunks
      // Note: The multipart upload ID should be stored in the database and passed here
      // For now, we'll use a simplified approach where each chunk gets its own signed URL
      // The actual multipart completion will happen in completeUpload
      
      // Ensure fileKey doesn't already have a .part suffix (clean it if it does)
      const cleanFileKey = fileKey.replace(/\.part\d+$/, '');
      const chunkKey = `${cleanFileKey}.part${request.chunkIndex}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: chunkKey, // Store chunks as separate files temporarily
        ContentType: request.mimeType,
        Metadata: {
          'upload-id': uploadId,
          'chunk-index': request.chunkIndex.toString(),
          'total-chunks': request.totalChunks.toString(),
          'file-name': request.fileName,
          'file-type': request.fileType,
          ...request.metadata,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      return {
        uploadUrl,
        uploadId,
        chunkKey: chunkKey,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    } else {
      // Single chunk upload - use regular PutObject
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: request.mimeType,
        Metadata: {
          'upload-id': uploadId,
          'chunk-index': request.chunkIndex.toString(),
          'total-chunks': request.totalChunks.toString(),
          'file-name': request.fileName,
          'file-type': request.fileType,
          ...request.metadata,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      return {
        uploadUrl,
        uploadId,
        chunkKey: fileKey,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }
  }

  async completeUpload(request: ICompleteUploadRequest): Promise<string> {
    // Use the provided file key or generate a new one if not provided (for backward compatibility)
    const fileKey = request.fileKey || this.generateUniqueFileKey(request.fileName, request.uploadId, request.fileType || 'image');
    
    this.logger.log(`Completing upload: ${request.uploadId}`);
    this.logger.log(`Using file key: ${fileKey} (provided: ${!!request.fileKey})`);
    this.logger.log(`Total chunks: ${request.chunkUrls.length}, Expected size: ${request.totalSize} bytes`);
    
    // If there's only one chunk, the file is already uploaded - just return the URL
    if (request.chunkUrls.length === 1) {
      const publicCdn = this.configService.get<string>('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
      const publicUrl = `${publicCdn}/${fileKey}`;
      this.logger.log(`Single chunk upload - returning URL: ${publicUrl}`);
      return publicUrl;
    }

    // For multipart uploads, we need to assemble the chunks
    // Reconstruct chunk keys based on the fileKey pattern
    // Chunks are stored as: {fileKey}.part0, {fileKey}.part1, etc.
    // Ensure fileKey doesn't already have a .part suffix (clean it if it does)
    const cleanFileKey = fileKey.replace(/\.part\d+$/, '');
    
    const chunkKeys: string[] = [];
    for (let i = 0; i < request.chunkUrls.length; i++) {
      // Generate the expected chunk key with .part suffix
      // This matches what generateSignedUrl creates for multipart uploads
      const chunkKey = `${cleanFileKey}.part${i}`;
      chunkKeys.push(chunkKey);
      this.logger.log(`Chunk ${i + 1}/${request.chunkUrls.length} expected key: ${chunkKey}`);
    }
    
    // Use cleanFileKey for the final assembled file
    const finalFileKey = cleanFileKey;

    // Create multipart upload
    const createMultipartCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: finalFileKey,
      ContentType: this.getContentTypeFromFileName(request.fileName),
    });

    const multipartUpload = await this.s3Client.send(createMultipartCommand);
    const multipartUploadId = multipartUpload.UploadId;
    
    if (!multipartUploadId) {
      throw new Error('Failed to create multipart upload');
    }

    this.logger.log(`Created multipart upload: ${multipartUploadId}`);

    try {
      // Upload each chunk as a part
      const parts: Array<{ PartNumber: number; ETag: string }> = [];
      
      for (let i = 0; i < chunkKeys.length; i++) {
        const chunkKey = chunkKeys[i];
        this.logger.log(`Uploading part ${i + 1}/${chunkKeys.length} from chunk: ${chunkKey}`);
        
        // Get the chunk object
        const getChunkCommand = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: chunkKey,
        });

        let chunkObject;
        try {
          chunkObject = await this.s3Client.send(getChunkCommand);
        } catch (error: any) {
          if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            throw new Error(
              `Chunk ${i + 1}/${chunkKeys.length} not found: ${chunkKey}. ` +
              `The chunk may not have been uploaded successfully. Please retry the upload.`
            );
          }
          throw new Error(
            `Failed to retrieve chunk ${i + 1}/${chunkKeys.length} (${chunkKey}): ${error.message || String(error)}`
          );
        }
        
        if (!chunkObject.Body) {
          throw new Error(`Chunk ${i + 1}/${chunkKeys.length} has no body: ${chunkKey}`);
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of chunkObject.Body as any) {
          chunks.push(chunk);
        }
        const chunkBuffer = Buffer.concat(chunks);

        // Upload as multipart part
        const uploadPartCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: finalFileKey,
          PartNumber: i + 1, // Part numbers start at 1
          UploadId: multipartUploadId,
          Body: chunkBuffer,
        });

        const uploadPartResponse = await this.s3Client.send(uploadPartCommand);
        
        if (!uploadPartResponse.ETag) {
          throw new Error(`Failed to upload part ${i + 1}: No ETag returned`);
        }

        parts.push({
          PartNumber: i + 1,
          ETag: uploadPartResponse.ETag,
        });

        this.logger.log(`Part ${i + 1}/${chunkKeys.length} uploaded successfully (ETag: ${uploadPartResponse.ETag})`);

        // Delete the temporary chunk file
        try {
          const deleteChunkCommand = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: chunkKey,
          });
          await this.s3Client.send(deleteChunkCommand);
          this.logger.log(`Deleted temporary chunk file: ${chunkKey}`);
        } catch (deleteError) {
          this.logger.warn(`Failed to delete temporary chunk ${chunkKey}:`, deleteError);
          // Don't fail the upload if cleanup fails
        }
      }

      // Complete the multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: finalFileKey,
        UploadId: multipartUploadId,
        MultipartUpload: {
          Parts: parts,
        },
      });

      const completeResponse = await this.s3Client.send(completeCommand);
      this.logger.log(`Multipart upload completed successfully: ${completeResponse.Location}`);

      // Generate a public URL using the custom CDN domain
      const publicCdn = this.configService.get<string>('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
      const publicUrl = `${publicCdn}/${finalFileKey}`;
      
      this.logger.log(`Generated public URL: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      // Abort multipart upload on error
      try {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: finalFileKey,
          UploadId: multipartUploadId,
        });
        await this.s3Client.send(abortCommand);
        this.logger.log(`Aborted multipart upload: ${multipartUploadId}`);
      } catch (abortError) {
        this.logger.error(`Failed to abort multipart upload:`, abortError);
      }

      this.logger.error(`Failed to complete multipart upload:`, error);
      throw error;
    }
  }

  private getContentTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'pdf': 'application/pdf',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      this.logger.log(`Attempting to delete file: ${fileUrl}`);
      
      const key = this.extractKeyFromUrl(fileUrl);
      this.logger.log(`Extracted key for deletion: ${key}`);
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      this.logger.log(`Sending delete command to R2 for bucket: ${this.bucketName}, key: ${key}`);
      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted file from R2: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileUrl}`, error);
      this.logger.error(`Error details: ${error.message}`);
      throw error;
    }
  }

  async getFileUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }



  private generateUniqueFileKey(fileName: string, uploadId: string, fileType: string): string {
    // Generate structured file path: uploads/{type}/{year}/{month}/{filename}
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate unique filename with timestamp and upload ID to prevent conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${uploadId}_${sanitizedFileName}`;
    
    // Map file type to folder
    const fileTypeFolder = this.getFileTypeFolder(fileType);
    return `uploads/${fileTypeFolder}/${year}/${month}/${uniqueFileName}`;
  }

  private generateChunkKey(fileName: string, uploadId: string, chunkIndex: number): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${uploadId}/chunks/${chunkIndex}_${sanitizedFileName}`;
  }

  private generateFinalKey(fileName: string, uploadId: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${uploadId}/final/${timestamp}_${sanitizedFileName}`;
  }

  private getFileTypeFolder(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'image':
        return 'images';
      case 'breed-image':
        return 'breeds';
      case 'breed-type-image':
        return 'breed-type';
      case 'video':
        return 'videos';
      case 'document':
        return 'documents';
      default:
        return 'images';
    }
  }

  private extractKeyFromUrl(fileUrl: string): string {
    // Extract the key from the R2 URL
    const url = new URL(fileUrl);
    const pathname = url.pathname;
    
    // Remove leading slash and return the path
    // For URLs like: https://cdn.pups4sale.com.au/uploads/images/2025/08/filename.jpg
    // We want to extract: uploads/images/2025/08/filename.jpg
    const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    this.logger.log(`Extracted key from URL: ${fileUrl} -> ${key}`);
    
    return key;
  }
} 