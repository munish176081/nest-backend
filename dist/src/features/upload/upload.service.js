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
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const r2_service_1 = require("./r2.service");
const upload_repository_1 = require("./upload.repository");
const request_upload_url_dto_1 = require("./dto/request-upload-url.dto");
let UploadService = UploadService_1 = class UploadService {
    constructor(r2Service, uploadRepository) {
        this.r2Service = r2Service;
        this.uploadRepository = uploadRepository;
        this.logger = new common_1.Logger(UploadService_1.name);
    }
    async requestUploadUrl(dto, userId) {
        this.logger.log(`Requesting upload URL for: ${dto.fileName}`);
        this.logger.log(`User ID: ${userId}`);
        this.validateFileType(dto.mimeType, dto.fileType);
        this.validateFileSize(dto.fileSize, dto.fileType);
        let upload = null;
        let fileKey;
        if (dto.uploadId) {
            upload = await this.uploadRepository.findByUploadId(dto.uploadId);
            if (!upload) {
                throw new common_1.NotFoundException('Upload session not found');
            }
            fileKey = upload.fileKey;
        }
        const signedUrlResponse = await this.r2Service.generateSignedUrl({
            fileName: dto.fileName,
            fileSize: dto.fileSize,
            mimeType: dto.mimeType,
            chunkIndex: dto.chunkIndex,
            totalChunks: dto.totalChunks,
            fileType: dto.fileType,
            uploadId: dto.uploadId,
            fileKey: fileKey,
            metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
        });
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
                fileKey: signedUrlResponse.chunkKey,
                metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
            });
            this.logger.log(`Created upload record: ${upload.id} with file key: ${signedUrlResponse.chunkKey}`);
        }
        else {
            this.logger.log(`Updating existing upload record: ${upload.id}`);
            await this.uploadRepository.updateByUploadId(dto.uploadId, {
                status: 'uploading',
            });
        }
        this.logger.log(`Generated upload URL for chunk ${dto.chunkIndex} of ${dto.fileName}`);
        return signedUrlResponse;
    }
    async completeUpload(dto, userId) {
        this.logger.log(`Completing upload: ${dto.uploadId}`);
        this.logger.log(`User ID: ${userId}`);
        const upload = await this.uploadRepository.findByUploadId(dto.uploadId);
        if (!upload) {
            throw new common_1.NotFoundException('Upload session not found');
        }
        this.logger.log(`Found upload record: ${upload.id}, Current user: ${upload.userId}`);
        if (userId && upload.userId !== userId) {
            throw new common_1.BadRequestException('You can only complete your own uploads');
        }
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
    async getUserUploads(userId) {
        return await this.uploadRepository.findByUserId(userId);
    }
    async getAllUploads() {
        return await this.uploadRepository.findAll();
    }
    async deleteUpload(uploadId, userId) {
        const upload = await this.uploadRepository.findByUploadId(uploadId);
        if (!upload) {
            throw new common_1.NotFoundException('Upload not found');
        }
        if (userId && upload.userId !== userId) {
            throw new common_1.BadRequestException('You can only delete your own uploads');
        }
        if (upload.finalUrl) {
            await this.r2Service.deleteFile(upload.finalUrl);
        }
        await this.uploadRepository.delete(upload.id);
        this.logger.log(`Deleted upload: ${upload.fileName}`);
    }
    async deleteUploadByUrl(fileUrl, userId) {
        this.logger.log(`Attempting to delete upload by URL: ${fileUrl}`);
        this.logger.log(`User ID: ${userId}`);
        const allUploads = await this.uploadRepository.findAll();
        this.logger.log(`Total uploads in database: ${allUploads.length}`);
        allUploads.forEach(upload => {
            this.logger.log(`Upload: ${upload.id} | URL: ${upload.finalUrl} | User: ${upload.userId || 'Anonymous'}`);
        });
        let upload = await this.uploadRepository.findByFinalUrl(fileUrl);
        this.logger.log(`Exact URL match result: ${upload ? 'Found' : 'Not found'}`);
        if (!upload) {
            this.logger.log(`Exact URL match failed, trying pattern matching...`);
            const uploads = await this.uploadRepository.findByUrlPattern(fileUrl);
            this.logger.log(`Pattern matching found ${uploads.length} matches`);
            if (uploads.length > 0) {
                upload = uploads[0];
                this.logger.log(`Found upload via pattern matching: ${upload.id}`);
            }
        }
        if (!upload) {
            this.logger.warn(`No upload record found for URL: ${fileUrl}`);
            this.logger.warn(`Available URLs in database:`);
            allUploads.forEach(u => {
                this.logger.warn(`  - ${u.finalUrl}`);
            });
            try {
                await this.r2Service.deleteFile(fileUrl);
                this.logger.log(`Deleted file from R2 without database record: ${fileUrl}`);
                return;
            }
            catch (error) {
                this.logger.error(`Failed to delete file from R2: ${fileUrl}`, error);
                throw new common_1.NotFoundException('Upload not found for this URL');
            }
        }
        this.logger.log(`Found upload record: ${upload.id}, User ID: ${upload.userId}`);
        if (userId && upload.userId && upload.userId !== userId) {
            this.logger.warn(`User ${userId} attempted to delete upload ${upload.id} owned by ${upload.userId}`);
            throw new common_1.BadRequestException('You can only delete your own uploads');
        }
        try {
            await this.r2Service.deleteFile(fileUrl);
            this.logger.log(`Deleted file from R2: ${fileUrl}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file from R2: ${fileUrl}`, error);
        }
        await this.uploadRepository.delete(upload.id);
        this.logger.log(`Deleted upload record: ${upload.id}`);
        this.logger.log(`Successfully deleted upload by URL: ${upload.fileName}`);
    }
    async deleteMultipleUploadsByUrls(fileUrls, userId) {
        this.logger.log(`Attempting to delete ${fileUrls.length} uploads`);
        this.logger.log(`User ID: ${userId}`);
        const results = {
            success: [],
            failed: []
        };
        for (const fileUrl of fileUrls) {
            try {
                await this.deleteUploadByUrl(fileUrl, userId);
                results.success.push(fileUrl);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.failed.push({ url: fileUrl, error: errorMessage });
                this.logger.error(`Failed to delete ${fileUrl}: ${errorMessage}`);
            }
        }
        this.logger.log(`Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`);
        return results;
    }
    validateFileType(mimeType, fileType) {
        const allowedMimeTypes = {
            [request_upload_url_dto_1.FileType.IMAGE]: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'image/bmp', 'image/tiff', 'image/svg+xml'
            ],
            [request_upload_url_dto_1.FileType.BREED_IMAGE]: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'image/bmp', 'image/tiff', 'image/svg+xml'
            ],
            [request_upload_url_dto_1.FileType.BREED_TYPE_IMAGE]: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'image/bmp', 'image/tiff', 'image/svg+xml'
            ],
            [request_upload_url_dto_1.FileType.VIDEO]: [
                'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
                'video/webm', 'video/mkv', 'video/3gp', 'video/ogg', 'video/m4v'
            ],
            [request_upload_url_dto_1.FileType.DOCUMENT]: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'text/csv',
                'application/rtf',
                'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'
            ],
        };
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
        const baseMimeType = mimeType.split(';')[0].trim();
        if (blockedMimeTypes.includes(baseMimeType)) {
            throw new common_1.BadRequestException(`File type not allowed for security reasons: ${mimeType}`);
        }
        const allowedTypes = allowedMimeTypes[fileType];
        if (!allowedTypes.includes(baseMimeType)) {
            throw new common_1.BadRequestException(`Invalid file type for ${fileType}: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
        }
    }
    validateFileSize(fileSize, fileType) {
        const maxSizes = {
            [request_upload_url_dto_1.FileType.IMAGE]: 30 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.BREED_IMAGE]: 30 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.BREED_TYPE_IMAGE]: 30 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.VIDEO]: 500 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.DOCUMENT]: 30 * 1024 * 1024,
        };
        const maxSize = maxSizes[fileType];
        if (fileSize > maxSize) {
            throw new common_1.BadRequestException(`File size exceeds maximum allowed for ${fileType}: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [r2_service_1.R2Service,
        upload_repository_1.UploadRepository])
], UploadService);
//# sourceMappingURL=upload.service.js.map