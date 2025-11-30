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
exports.UpdateUserProfileDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class IdVerificationDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], IdVerificationDto.prototype, "governmentId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], IdVerificationDto.prototype, "selfieWithId", void 0);
class UpdateUserProfileDto {
}
exports.UpdateUserProfileDto = UpdateUserProfileDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Name is required' }),
    (0, class_validator_1.MaxLength)(256, { message: 'Name must be less than 256 characters' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9 ]+$/, { message: 'Name must be alphanumeric and can include spaces only' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3, { message: 'Username must be at least 3 characters' }),
    (0, class_validator_1.MaxLength)(256, { message: 'Username must be less than 256 characters' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(512, { message: 'Image URL must be less than 512 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Phone is required' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(250, { message: 'Bio must be 250 characters or less' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "bio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({}, { message: 'Please provide a valid website URL' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "website", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Business or Breeders name is required' }),
    (0, class_validator_1.MaxLength)(256, { message: 'Business name must be less than 256 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Business ABN is required' }),
    (0, class_validator_1.Matches)(/^\d{11}$/, { message: 'ABN must be exactly 11 digits' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "businessABN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Description is required' }),
    (0, class_validator_1.MaxLength)(1000, { message: 'Description must be 1000 characters or less' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Location is required' }),
    (0, class_validator_1.MaxLength)(256, { message: 'Location must be less than 256 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => IdVerificationDto),
    __metadata("design:type", IdVerificationDto)
], UpdateUserProfileDto.prototype, "idVerification", void 0);
//# sourceMappingURL=update-user-profile.dto.js.map