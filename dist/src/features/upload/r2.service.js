"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var R2Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
let R2Service = R2Service_1 = class R2Service {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(R2Service_1.name);
        this.bucketName = this.configService.get('R2_BUCKET_NAME');
        this.region = this.configService.get('R2_REGION', 'auto');
        const endpoint = this.configService.get('R2_ENDPOINT');
        const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');
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
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
            endpoint: endpoint,
            forcePathStyle: true,
            credentials: {
                accessKeyId: accessKeyId || '',
                secretAccessKey: secretAccessKey || '',
            },
        });
    }
    async generateSignedUrl(request) {
        const uploadId = request.uploadId || (0, uuid_1.v4)();
        const fileKey = request.fileKey || this.generateUniqueFileKey(request.fileName, uploadId, request.fileType);
        this.logger.log(`Generating signed URL with file key: ${fileKey} (provided: ${!!request.fileKey})`);
        if (request.totalChunks > 1) {
            const cleanFileKey = fileKey.replace(/\.part\d+$/, '');
            const chunkKey = `${cleanFileKey}.part${request.chunkIndex}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: chunkKey,
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
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 3600 });
            return {
                uploadUrl,
                uploadId,
                chunkKey: chunkKey,
                expiresAt: new Date(Date.now() + 3600 * 1000),
            };
        }
        else {
            const command = new client_s3_1.PutObjectCommand({
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
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 3600 });
            return {
                uploadUrl,
                uploadId,
                chunkKey: fileKey,
                expiresAt: new Date(Date.now() + 3600 * 1000),
            };
        }
    }
    async completeUpload(request) {
        const fileKey = request.fileKey || this.generateUniqueFileKey(request.fileName, request.uploadId, request.fileType || 'image');
        this.logger.log(`Completing upload: ${request.uploadId}`);
        this.logger.log(`Using file key: ${fileKey} (provided: ${!!request.fileKey})`);
        this.logger.log(`Total chunks: ${request.chunkUrls.length}, Expected size: ${request.totalSize} bytes`);
        if (request.chunkUrls.length === 1) {
            const publicCdn = this.configService.get('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
            const publicUrl = `${publicCdn}/${fileKey}`;
            this.logger.log(`Single chunk upload - returning URL: ${publicUrl}`);
            return publicUrl;
        }
        const cleanFileKey = fileKey.replace(/\.part\d+$/, '');
        const chunkKeys = [];
        for (let i = 0; i < request.chunkUrls.length; i++) {
            const chunkKey = `${cleanFileKey}.part${i}`;
            chunkKeys.push(chunkKey);
            this.logger.log(`Chunk ${i + 1}/${request.chunkUrls.length} expected key: ${chunkKey}`);
        }
        const finalFileKey = cleanFileKey;
        const createMultipartCommand = new client_s3_1.CreateMultipartUploadCommand({
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
            const parts = [];
            for (let i = 0; i < chunkKeys.length; i++) {
                const chunkKey = chunkKeys[i];
                this.logger.log(`Uploading part ${i + 1}/${chunkKeys.length} from chunk: ${chunkKey}`);
                const getChunkCommand = new client_s3_1.GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: chunkKey,
                });
                let chunkObject;
                try {
                    chunkObject = await this.s3Client.send(getChunkCommand);
                }
                catch (error) {
                    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
                        throw new Error(`Chunk ${i + 1}/${chunkKeys.length} not found: ${chunkKey}. ` +
                            `The chunk may not have been uploaded successfully. Please retry the upload.`);
                    }
                    throw new Error(`Failed to retrieve chunk ${i + 1}/${chunkKeys.length} (${chunkKey}): ${error.message || String(error)}`);
                }
                if (!chunkObject.Body) {
                    throw new Error(`Chunk ${i + 1}/${chunkKeys.length} has no body: ${chunkKey}`);
                }
                const chunks = [];
                for await (const chunk of chunkObject.Body) {
                    chunks.push(chunk);
                }
                const chunkBuffer = Buffer.concat(chunks);
                const uploadPartCommand = new client_s3_1.UploadPartCommand({
                    Bucket: this.bucketName,
                    Key: finalFileKey,
                    PartNumber: i + 1,
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
                try {
                    const deleteChunkCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: this.bucketName,
                        Key: chunkKey,
                    });
                    await this.s3Client.send(deleteChunkCommand);
                    this.logger.log(`Deleted temporary chunk file: ${chunkKey}`);
                }
                catch (deleteError) {
                    this.logger.warn(`Failed to delete temporary chunk ${chunkKey}:`, deleteError);
                }
            }
            const completeCommand = new client_s3_1.CompleteMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: finalFileKey,
                UploadId: multipartUploadId,
                MultipartUpload: {
                    Parts: parts,
                },
            });
            const completeResponse = await this.s3Client.send(completeCommand);
            this.logger.log(`Multipart upload completed successfully: ${completeResponse.Location}`);
            const publicCdn = this.configService.get('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
            const publicUrl = `${publicCdn}/${finalFileKey}`;
            this.logger.log(`Generated public URL: ${publicUrl}`);
            return publicUrl;
        }
        catch (error) {
            try {
                const abortCommand = new client_s3_1.AbortMultipartUploadCommand({
                    Bucket: this.bucketName,
                    Key: finalFileKey,
                    UploadId: multipartUploadId,
                });
                await this.s3Client.send(abortCommand);
                this.logger.log(`Aborted multipart upload: ${multipartUploadId}`);
            }
            catch (abortError) {
                this.logger.error(`Failed to abort multipart upload:`, abortError);
            }
            this.logger.error(`Failed to complete multipart upload:`, error);
            throw error;
        }
    }
    getContentTypeFromFileName(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const contentTypes = {
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
    async deleteFile(fileUrl) {
        try {
            this.logger.log(`Attempting to delete file: ${fileUrl}`);
            const key = this.extractKeyFromUrl(fileUrl);
            this.logger.log(`Extracted key for deletion: ${key}`);
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            this.logger.log(`Sending delete command to R2 for bucket: ${this.bucketName}, key: ${key}`);
            await this.s3Client.send(command);
            this.logger.log(`Successfully deleted file from R2: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${fileUrl}`, error);
            this.logger.error(`Error details: ${error.message}`);
            throw error;
        }
    }
    async getFileUrl(fileKey) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
        });
        return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 3600 });
    }
    generateUniqueFileKey(fileName, uploadId, fileType) {
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}_${uploadId}_${sanitizedFileName}`;
        const fileTypeFolder = this.getFileTypeFolder(fileType);
        return `uploads/${fileTypeFolder}/${year}/${month}/${uniqueFileName}`;
    }
    generateChunkKey(fileName, uploadId, chunkIndex) {
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `uploads/${uploadId}/chunks/${chunkIndex}_${sanitizedFileName}`;
    }
    generateFinalKey(fileName, uploadId) {
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `uploads/${uploadId}/final/${timestamp}_${sanitizedFileName}`;
    }
    getFileTypeFolder(fileType) {
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
    extractKeyFromUrl(fileUrl) {
        const url = new URL(fileUrl);
        const pathname = url.pathname;
        const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        this.logger.log(`Extracted key from URL: ${fileUrl} -> ${key}`);
        return key;
    }
};
exports.R2Service = R2Service;
exports.R2Service = R2Service = R2Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], R2Service);
//# sourceMappingURL=r2.service.js.map