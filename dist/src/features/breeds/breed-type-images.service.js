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
exports.BreedTypeImagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const breed_type_image_entity_1 = require("./entities/breed-type-image.entity");
const breed_entity_1 = require("./entities/breed.entity");
let BreedTypeImagesService = class BreedTypeImagesService {
    constructor(breedTypeImageRepository, breedRepository) {
        this.breedTypeImageRepository = breedTypeImageRepository;
        this.breedRepository = breedRepository;
    }
    async create(createBreedTypeImageDto) {
        const existing = await this.breedTypeImageRepository.findOne({
            where: { category: createBreedTypeImageDto.category }
        });
        if (existing) {
            throw new common_1.ConflictException(`Breed type image for category '${createBreedTypeImageDto.category}' already exists`);
        }
        const breedTypeImage = this.breedTypeImageRepository.create(createBreedTypeImageDto);
        return await this.breedTypeImageRepository.save(breedTypeImage);
    }
    async findAll() {
        return await this.breedTypeImageRepository.find({
            order: { sortOrder: 'ASC', category: 'ASC' }
        });
    }
    async findActive() {
        return await this.breedTypeImageRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', category: 'ASC' }
        });
    }
    async findOne(id) {
        const breedTypeImage = await this.breedTypeImageRepository.findOne({
            where: { id }
        });
        if (!breedTypeImage) {
            throw new common_1.NotFoundException(`Breed type image with ID '${id}' not found`);
        }
        return breedTypeImage;
    }
    async findByCategory(category) {
        const breedTypeImage = await this.breedTypeImageRepository.findOne({
            where: { category }
        });
        if (!breedTypeImage) {
            throw new common_1.NotFoundException(`Breed type image for category '${category}' not found`);
        }
        return breedTypeImage;
    }
    async update(id, updateBreedTypeImageDto) {
        const breedTypeImage = await this.findOne(id);
        if (updateBreedTypeImageDto.category && updateBreedTypeImageDto.category !== breedTypeImage.category) {
            const existing = await this.breedTypeImageRepository.findOne({
                where: { category: updateBreedTypeImageDto.category }
            });
            if (existing) {
                throw new common_1.ConflictException(`Breed type image for category '${updateBreedTypeImageDto.category}' already exists`);
            }
        }
        Object.assign(breedTypeImage, updateBreedTypeImageDto);
        return await this.breedTypeImageRepository.save(breedTypeImage);
    }
    async remove(id) {
        const breedTypeImage = await this.findOne(id);
        await this.breedTypeImageRepository.remove(breedTypeImage);
    }
    async toggleStatus(id) {
        const breedTypeImage = await this.findOne(id);
        breedTypeImage.isActive = !breedTypeImage.isActive;
        return await this.breedTypeImageRepository.save(breedTypeImage);
    }
    async getUniqueCategoriesFromBreeds() {
        const result = await this.breedRepository
            .createQueryBuilder('breed')
            .select('DISTINCT LOWER(breed.category)', 'category')
            .where('breed.category IS NOT NULL')
            .andWhere('breed.category != :empty', { empty: '' })
            .orderBy('LOWER(breed.category)', 'ASC')
            .getRawMany();
        return result.map(row => row.category).filter(category => category);
    }
    async getAvailableCategoriesForImages() {
        const uniqueCategories = await this.getUniqueCategoriesFromBreeds();
        const existingImages = await this.breedTypeImageRepository.find({
            select: ['id', 'category']
        });
        const existingCategories = new Set(existingImages.map(img => img.category.toLowerCase()));
        const imageMap = new Map(existingImages.map(img => [img.category.toLowerCase(), img.id]));
        return uniqueCategories.map(category => ({
            category,
            hasImage: existingCategories.has(category.toLowerCase()),
            imageId: imageMap.get(category.toLowerCase())
        }));
    }
    async createImageForCategory(category, imageUrl, title, description) {
        const breedExists = await this.breedRepository.findOne({
            where: { category: category.toLowerCase() }
        });
        if (!breedExists) {
            throw new common_1.NotFoundException(`Category '${category}' not found in breeds table`);
        }
        const existing = await this.breedTypeImageRepository.findOne({
            where: { category: category.toLowerCase() }
        });
        if (existing) {
            throw new common_1.ConflictException(`Breed type image for category '${category}' already exists`);
        }
        const breedTypeImage = this.breedTypeImageRepository.create({
            category: category.toLowerCase(),
            imageUrl,
            title: title || category.charAt(0).toUpperCase() + category.slice(1),
            description: description || `Image for ${category} breed category`,
            isActive: true,
            sortOrder: 0
        });
        return await this.breedTypeImageRepository.save(breedTypeImage);
    }
};
exports.BreedTypeImagesService = BreedTypeImagesService;
exports.BreedTypeImagesService = BreedTypeImagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(breed_type_image_entity_1.BreedTypeImage)),
    __param(1, (0, typeorm_1.InjectRepository)(breed_entity_1.Breed)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BreedTypeImagesService);
//# sourceMappingURL=breed-type-images.service.js.map