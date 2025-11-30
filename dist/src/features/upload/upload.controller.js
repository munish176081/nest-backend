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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UploadController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const upload_service_1 = require("./upload.service");
const request_upload_url_dto_1 = require("./dto/request-upload-url.dto");
const complete_upload_dto_1 = require("./dto/complete-upload.dto");
const delete_upload_by_url_dto_1 = require("./dto/delete-upload-by-url.dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let UploadController = UploadController_1 = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
        this.logger = new common_1.Logger(UploadController_1.name);
    }
    async requestUploadUrl(dto, req) {
        const userId = req.user?.id;
        const uploadUrl = await this.uploadService.requestUploadUrl(dto, userId);
        console.log(uploadUrl);
        return uploadUrl;
    }
    async completeUpload(dto, req) {
        const userId = req.user?.id;
        return await this.uploadService.completeUpload(dto, userId);
    }
    async getUserUploads(req) {
        const userId = req.user?.id;
        return await this.uploadService.getUserUploads(userId);
    }
    async getAllUploads() {
        return await this.uploadService.getAllUploads();
    }
    async testDelete(body, req) {
        const userId = req.user?.id;
        try {
            await this.uploadService.deleteUploadByUrl(body.fileUrl, userId);
            return { success: true, message: 'Delete successful' };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.response?.data || error
            };
        }
    }
    async bulkDeleteUploads(body, req) {
        const userId = req.user?.id;
        const results = await this.uploadService.deleteMultipleUploadsByUrls(body.fileUrls, userId);
        const success = results.failed.length === 0;
        return {
            success,
            message: `Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`,
            results
        };
    }
    async deleteUpload(uploadId, req) {
        const userId = req.user?.id;
        await this.uploadService.deleteUpload(uploadId, userId);
    }
    async deleteUploadByUrl(dto, req) {
        const userId = req.user?.id;
        await this.uploadService.deleteUploadByUrl(dto.fileUrl, userId);
    }
    async proxyImage(imageUrl, res) {
        this.logger.log(`Proxy image request received for URL: ${imageUrl}`);
        if (!imageUrl) {
            this.logger.warn('Proxy image request missing URL parameter');
            return res.status(400).json({ error: 'Image URL is required' });
        }
        try {
            const allowedDomains = ['cdn.pups4sale.com.au', 'pups4sale.com.au', 'www.pups4sale.com.au'];
            const isAllowedDomain = allowedDomains.some(domain => imageUrl.includes(domain));
            if (!isAllowedDomain) {
                this.logger.warn(`Invalid image URL (not from allowed domain): ${imageUrl}`);
                return res.status(403).json({ error: 'Invalid image URL' });
            }
            this.logger.log(`Fetching image from R2: ${imageUrl}`);
            const response = await fetch(imageUrl);
            this.logger.log(`R2 response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
            if (!response.ok) {
                this.logger.error(`Failed to fetch image from R2: ${response.status} ${response.statusText}`);
                return res.status(response.status).json({ error: 'Failed to fetch image' });
            }
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            this.logger.log(`Serving image with content-type: ${contentType}`);
            res.set({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
            });
            const buffer = await response.arrayBuffer();
            this.logger.log(`Image buffer size: ${buffer.byteLength} bytes`);
            res.send(Buffer.from(buffer));
            this.logger.log('Image served successfully');
        }
        catch (error) {
            this.logger.error('Error proxying image:', error);
            res.status(500).json({ error: 'Failed to proxy image' });
        }
    }
    async proxyTest(res) {
        this.logger.log('Proxy test endpoint called');
        res.json({ message: 'Proxy endpoint is working', timestamp: new Date().toISOString() });
    }
    async requestPublicUploadUrl(dto) {
        return await this.uploadService.requestUploadUrl(dto);
    }
    async completePublicUpload(dto) {
        return await this.uploadService.completeUpload(dto);
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('request-url'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_upload_url_dto_1.RequestUploadUrlDto, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "requestUploadUrl", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [complete_upload_dto_1.CompleteUploadDto, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "completeUpload", null);
__decorate([
    (0, common_1.Get)('my-uploads'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getUserUploads", null);
__decorate([
    (0, common_1.Get)('debug/all'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getAllUploads", null);
__decorate([
    (0, common_1.Post)('debug/test-delete'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "testDelete", null);
__decorate([
    (0, common_1.Post)('bulk-delete'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "bulkDeleteUploads", null);
__decorate([
    (0, common_1.Delete)(':uploadId'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('uploadId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteUpload", null);
__decorate([
    (0, common_1.Delete)('by-url'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [delete_upload_by_url_dto_1.DeleteUploadByUrlDto, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteUploadByUrl", null);
__decorate([
    (0, common_1.Get)('proxy/image'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "proxyImage", null);
__decorate([
    (0, common_1.Get)('proxy/test'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "proxyTest", null);
__decorate([
    (0, common_1.Post)('public/request-url'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_upload_url_dto_1.RequestUploadUrlDto]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "requestPublicUploadUrl", null);
__decorate([
    (0, common_1.Post)('public/complete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [complete_upload_dto_1.CompleteUploadDto]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "completePublicUpload", null);
exports.UploadController = UploadController = UploadController_1 = __decorate([
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map