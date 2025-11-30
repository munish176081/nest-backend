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
exports.BreedsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const breed_entity_1 = require("./entities/breed.entity");
let BreedsRepository = class BreedsRepository {
    constructor(breedRepository) {
        this.breedRepository = breedRepository;
    }
    async findAll(query) {
        const { search, category, size, isActive, page, limit, sortBy, sortOrder } = query;
        const queryBuilder = this.breedRepository.createQueryBuilder('breed');
        queryBuilder.andWhere('breed.deletedAt IS NULL');
        if (search) {
            queryBuilder.andWhere('(breed.name ILIKE :search OR breed.description ILIKE :search OR breed.temperament ILIKE :search)', { search: `%${search}%` });
        }
        if (category) {
            queryBuilder.andWhere('breed.category = :category', { category });
        }
        if (size) {
            queryBuilder.andWhere('breed.size = :size', { size });
        }
        if (isActive !== undefined) {
            queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
        }
        queryBuilder.orderBy(`breed.${sortBy}`, sortOrder);
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        const [breeds, total] = await queryBuilder.getManyAndCount();
        return {
            breeds,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findById(id) {
        return this.breedRepository.findOne({ where: { id } });
    }
    async findBySlug(slug) {
        return this.breedRepository.findOne({ where: { slug } });
    }
    async findByName(name) {
        return this.breedRepository.findOne({ where: { name } });
    }
    async findActiveBreeds() {
        return this.breedRepository.find({
            where: { isActive: true, deletedAt: null },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }
    async findBreedsByCategory(category) {
        return this.breedRepository.find({
            where: { category, isActive: true, deletedAt: null },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }
    async findCategories() {
        const result = await this.breedRepository
            .createQueryBuilder('breed')
            .select('DISTINCT breed.category', 'category')
            .where('breed.category IS NOT NULL')
            .andWhere('breed.deletedAt IS NULL')
            .orderBy('breed.category', 'ASC')
            .getRawMany();
        return result.map(item => item.category);
    }
    async findSizes() {
        const result = await this.breedRepository
            .createQueryBuilder('breed')
            .select('DISTINCT breed.size', 'size')
            .where('breed.size IS NOT NULL')
            .andWhere('breed.deletedAt IS NULL')
            .orderBy('breed.size', 'ASC')
            .getRawMany();
        return result.map(item => item.size);
    }
    async create(breedData) {
        const breed = this.breedRepository.create(breedData);
        return this.breedRepository.save(breed);
    }
    async update(id, breedData) {
        await this.breedRepository.update(id, breedData);
        return this.findById(id);
    }
    async delete(id) {
        await this.breedRepository.delete(id);
    }
    async softDelete(id) {
        await this.breedRepository.update(id, { deletedAt: new Date() });
    }
};
exports.BreedsRepository = BreedsRepository;
exports.BreedsRepository = BreedsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(breed_entity_1.Breed)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BreedsRepository);
//# sourceMappingURL=breeds.repository.js.map