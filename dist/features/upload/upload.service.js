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
        this.validateFileType(dto.mimeType, dto.fileType);
        this.validateFileSize(dto.fileSize, dto.fileType);
        let upload = null;
        if (dto.uploadId) {
            upload = await this.uploadRepository.findByUploadId(dto.uploadId);
            if (!upload) {
                throw new common_1.NotFoundException('Upload session not found');
            }
        }
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
        }
        else {
            await this.uploadRepository.updateByUploadId(dto.uploadId, {
                status: 'uploading',
            });
        }
        this.logger.log(`Generated upload URL for chunk ${dto.chunkIndex} of ${dto.fileName}`);
        return signedUrlResponse;
    }
    async completeUpload(dto, userId) {
        const upload = await this.uploadRepository.findByUploadId(dto.uploadId);
        if (!upload) {
            throw new common_1.NotFoundException('Upload session not found');
        }
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
            metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
        });
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
    async getUserUploads(userId) {
        return await this.uploadRepository.findByUserId(userId);
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
    validateFileType(mimeType, fileType) {
        const allowedMimeTypes = {
            [request_upload_url_dto_1.FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            [request_upload_url_dto_1.FileType.VIDEO]: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
            [request_upload_url_dto_1.FileType.DOCUMENT]: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        };
        const allowedTypes = allowedMimeTypes[fileType];
        if (!allowedTypes.includes(mimeType)) {
            throw new common_1.BadRequestException(`Invalid file type for ${fileType}: ${mimeType}`);
        }
    }
    validateFileSize(fileSize, fileType) {
        const maxSizes = {
            [request_upload_url_dto_1.FileType.IMAGE]: 10 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.VIDEO]: 100 * 1024 * 1024,
            [request_upload_url_dto_1.FileType.DOCUMENT]: 50 * 1024 * 1024,
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