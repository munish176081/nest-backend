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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const upload_service_1 = require("./upload.service");
const request_upload_url_dto_1 = require("./dto/request-upload-url.dto");
const complete_upload_dto_1 = require("./dto/complete-upload.dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
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
    async deleteUpload(uploadId, req) {
        const userId = req.user?.id;
        await this.uploadService.deleteUpload(uploadId, userId);
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
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map