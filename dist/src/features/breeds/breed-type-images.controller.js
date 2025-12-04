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
exports.BreedTypeImagesController = void 0;
const common_1 = require("@nestjs/common");
const breed_type_images_service_1 = require("./breed-type-images.service");
const breeds_service_1 = require("./breeds.service");
const create_breed_type_image_dto_1 = require("./dto/create-breed-type-image.dto");
const update_breed_type_image_dto_1 = require("./dto/update-breed-type-image.dto");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
let BreedTypeImagesController = class BreedTypeImagesController {
    constructor(breedTypeImagesService, breedsService) {
        this.breedTypeImagesService = breedTypeImagesService;
        this.breedsService = breedsService;
    }
    findFeatured() {
        return this.breedTypeImagesService.findActive();
    }
    findActive() {
        return this.breedTypeImagesService.findActive();
    }
    createCategory(body) {
        return this.breedsService.createCategory(body.category);
    }
    create(createBreedTypeImageDto) {
        return this.breedTypeImagesService.create(createBreedTypeImageDto);
    }
    findAll() {
        return this.breedTypeImagesService.findAll();
    }
    findOne(id) {
        return this.breedTypeImagesService.findOne(id);
    }
    findByCategory(category) {
        return this.breedTypeImagesService.findByCategory(category);
    }
    update(id, updateBreedTypeImageDto) {
        return this.breedTypeImagesService.update(id, updateBreedTypeImageDto);
    }
    toggleStatus(id) {
        return this.breedTypeImagesService.toggleStatus(id);
    }
    remove(id) {
        return this.breedTypeImagesService.remove(id);
    }
    getAvailableCategories() {
        return this.breedTypeImagesService.getAvailableCategoriesForImages();
    }
    getUniqueCategories() {
        return this.breedTypeImagesService.getUniqueCategoriesFromBreeds();
    }
    createImageForCategory(category, body) {
        return this.breedTypeImagesService.createImageForCategory(category, body.imageUrl, body.title, body.description);
    }
};
exports.BreedTypeImagesController = BreedTypeImagesController;
__decorate([
    (0, common_1.Get)('homepage/featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "findFeatured", null);
__decorate([
    (0, common_1.Get)('admin/active'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "findActive", null);
__decorate([
    (0, common_1.Post)('admin/categories'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_breed_type_image_dto_1.CreateBreedTypeImageDto]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('admin/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('admin/category/:category'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "findByCategory", null);
__decorate([
    (0, common_1.Patch)('admin/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_breed_type_image_dto_1.UpdateBreedTypeImageDto]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('admin/:id/toggle-status'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Delete)('admin/:id'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('admin/categories/available'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "getAvailableCategories", null);
__decorate([
    (0, common_1.Get)('admin/categories/unique'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "getUniqueCategories", null);
__decorate([
    (0, common_1.Post)('admin/category/:category'),
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard),
    __param(0, (0, common_1.Param)('category')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BreedTypeImagesController.prototype, "createImageForCategory", null);
exports.BreedTypeImagesController = BreedTypeImagesController = __decorate([
    (0, common_1.Controller)('breed-type-images'),
    __metadata("design:paramtypes", [breed_type_images_service_1.BreedTypeImagesService,
        breeds_service_1.BreedsService])
], BreedTypeImagesController);
//# sourceMappingURL=breed-type-images.controller.js.map