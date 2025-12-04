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
exports.BreedsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const breeds_service_1 = require("./breeds.service");
const create_breed_dto_1 = require("./dto/create-breed.dto");
const update_breed_dto_1 = require("./dto/update-breed.dto");
const query_breed_dto_1 = require("./dto/query-breed.dto");
const breed_response_dto_1 = require("./dto/breed-response.dto");
const serialize_interceptor_1 = require("../../transformers/serialize.interceptor");
let BreedsController = class BreedsController {
    constructor(breedsService) {
        this.breedsService = breedsService;
    }
    create(createBreedDto) {
        return this.breedsService.create(createBreedDto);
    }
    async findAll(query) {
        console.log('Controller received query:', query);
        const result = await this.breedsService.findAll(query);
        console.log('Controller returning result:', result);
        return result;
    }
    findActiveBreeds() {
        return this.breedsService.findActiveBreeds();
    }
    findFeaturedBreeds() {
        return this.breedsService.findFeaturedBreeds();
    }
    findCategories() {
        return this.breedsService.findCategories();
    }
    findSizes() {
        return this.breedsService.findSizes();
    }
    searchBreeds(searchTerm) {
        if (!searchTerm) {
            return this.breedsService.findActiveBreeds();
        }
        return this.breedsService.searchBreeds(searchTerm);
    }
    findFeaturedBreedTypeImages() {
        return this.breedsService.findActiveBreeds();
    }
    findBreedsByCategory(category) {
        return this.breedsService.findBreedsByCategory(category);
    }
    findBySlug(slug) {
        return this.breedsService.findBySlug(slug);
    }
    getFeaturedBreeds() {
        return this.breedsService.getFeaturedBreeds();
    }
    async importBreeds(file) {
        return this.breedsService.importFromCSV(file);
    }
    findOne(id) {
        return this.breedsService.findById(id);
    }
    update(id, updateBreedDto) {
        return this.breedsService.update(id, updateBreedDto);
    }
    remove(id) {
        return this.breedsService.delete(id);
    }
    hardRemove(id) {
        return this.breedsService.hardDelete(id);
    }
    toggleFeaturedStatus(id) {
        return this.breedsService.toggleFeaturedStatus(id);
    }
};
exports.BreedsController = BreedsController;
__decorate([
    (0, common_1.Post)(),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_breed_dto_1.CreateBreedDto]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.PaginatedBreedsResponseDto),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_breed_dto_1.QueryBreedDto]),
    __metadata("design:returntype", Promise)
], BreedsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findActiveBreeds", null);
__decorate([
    (0, common_1.Get)('homepage/featured'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findFeaturedBreeds", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findCategories", null);
__decorate([
    (0, common_1.Get)('sizes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findSizes", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "searchBreeds", null);
__decorate([
    (0, common_1.Get)('type-images/homepage/featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findFeaturedBreedTypeImages", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findBreedsByCategory", null);
__decorate([
    (0, common_1.Get)('slug/:slug'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Get)('featured'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "getFeaturedBreeds", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BreedsController.prototype, "importBreeds", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, serialize_interceptor_1.Serialize)(breed_response_dto_1.BreedResponseDto),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_breed_dto_1.UpdateBreedDto]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(':id/hard'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "hardRemove", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-featured'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BreedsController.prototype, "toggleFeaturedStatus", null);
exports.BreedsController = BreedsController = __decorate([
    (0, common_1.Controller)('breeds'),
    __metadata("design:paramtypes", [breeds_service_1.BreedsService])
], BreedsController);
//# sourceMappingURL=breeds.controller.js.map