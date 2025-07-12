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
        console.log(this.configService.get('R2_ENDPOINT'));
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
            endpoint: this.configService.get('R2_ENDPOINT'),
            forcePathStyle: true,
            credentials: {
                accessKeyId: this.configService.get('R2_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('R2_SECRET_ACCESS_KEY'),
            },
        });
        console.log(this.s3Client);
    }
    async generateSignedUrl(request) {
        const uploadId = request.uploadId || (0, uuid_1.v4)();
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileTypeFolder = this.getFileTypeFolder(request.fileType);
        const fileKey = `uploads/${fileTypeFolder}/${year}/${month}/${sanitizedFileName}`;
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
    async completeUpload(request) {
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileTypeFolder = this.getFileTypeFolder(request.fileType || 'image');
        const fileKey = `uploads/${fileTypeFolder}/${year}/${month}/${sanitizedFileName}`;
        const publicCdn = this.configService.get('R2_PUBLIC_CDN', 'https://cdn.pups4sale.com.au');
        const publicUrl = `${publicCdn}/${fileKey}`;
        this.logger.log(`Generated public URL: ${publicUrl}`);
        return publicUrl;
    }
    async deleteFile(fileUrl) {
        try {
            const key = this.extractKeyFromUrl(fileUrl);
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            this.logger.log(`Deleted file: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${fileUrl}`, error);
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
        return url.pathname.substring(1);
    }
};
exports.R2Service = R2Service;
exports.R2Service = R2Service = R2Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], R2Service);
//# sourceMappingURL=r2.service.js.map