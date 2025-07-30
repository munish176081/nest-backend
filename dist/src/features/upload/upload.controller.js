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
    async bulkDelete(body, req) {
        const userId = req.user?.id;
        try {
            const results = await this.uploadService.deleteMultipleUploadsByUrls(body.fileUrls, userId);
            return {
                success: true,
                message: `Bulk delete completed: ${results.success.length} successful, ${results.failed.length} failed`,
                results
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
                error: error.response?.data || error
            };
        }
    }
    async deleteUpload(uploadId, req) {
        const userId = req.user?.id;
        await this.uploadService.deleteUpload(uploadId, userId);
    }
    async deleteUploadByUrl(dto, req) {
        const userId = req.user?.id;
        await this.uploadService.deleteUploadByUrl(dto.fileUrl, userId);
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
    (0, common_1.Post)('debug/bulk-delete'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "bulkDelete", null);
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