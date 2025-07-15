import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

    console.log(this.configService.get<string>('R2_ENDPOINT')); 
    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      forcePathStyle: true, 
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
    console.log(this.s3Client);
  }

  async generateSignedUrl(request: IUploadRequest): Promise<ISignedUrlResponse> {
    const uploadId = request.uploadId || uuidv4();
    
    // Generate structured file path: uploads/{type}/{year}/{month}/{filename}
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Map file type to folder
    const fileTypeFolder = this.getFileTypeFolder(request.fileType);
    const fileKey = `uploads/${fileTypeFolder}/${year}/${month}/${sanitizedFileName}`;
    
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

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour

    return {
      uploadUrl,
      uploadId,
      chunkKey: fileKey, // Use the structured path as chunkKey
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  async completeUpload(request: ICompleteUploadRequest): Promise<string> {
    // Use the same structured path that was used during upload
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Map file type to folder
    const fileTypeFolder = this.getFileTypeFolder(request.fileType || 'image');
    const fileKey = `uploads/${fileTypeFolder}/${year}/${month}/${sanitizedFileName}`;
    
    // Generate a public URL using the custom CDN domain
    const publicCdn = this.configService.get<string>('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
    const publicUrl = `${publicCdn}/${fileKey}`;
    
    this.logger.log(`Generated public URL: ${publicUrl}`);
    
    return publicUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileUrl}`, error);
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
    return url.pathname.substring(1); // Remove leading slash
  }
} 