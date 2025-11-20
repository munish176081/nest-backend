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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestUploadUrlDto = exports.FileType = void 0;
const class_validator_1 = require("class-validator");
var FileType;
(function (FileType) {
    FileType["IMAGE"] = "image";
    FileType["BREED_IMAGE"] = "breed-image";
    FileType["BREED_TYPE_IMAGE"] = "breed-type-image";
    FileType["VIDEO"] = "video";
    FileType["DOCUMENT"] = "document";
})(FileType || (exports.FileType = FileType = {}));
class RequestUploadUrlDto {
}
exports.RequestUploadUrlDto = RequestUploadUrlDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestUploadUrlDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100 * 1024 * 1024),
    __metadata("design:type", Number)
], RequestUploadUrlDto.prototype, "fileSize", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestUploadUrlDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], RequestUploadUrlDto.prototype, "chunkIndex", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RequestUploadUrlDto.prototype, "totalChunks", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(FileType),
    __metadata("design:type", String)
], RequestUploadUrlDto.prototype, "fileType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestUploadUrlDto.prototype, "uploadId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestUploadUrlDto.prototype, "metadata", void 0);
//# sourceMappingURL=request-upload-url.dto.js.map