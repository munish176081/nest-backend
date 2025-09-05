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
exports.BreedsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const breed_entity_1 = require("./entities/breed.entity");
let BreedsService = class BreedsService {
    constructor(breedRepository) {
        this.breedRepository = breedRepository;
    }
    async findAll(query) {
        const { search, category, size, isActive, page, limit, sortBy, sortOrder } = query;
        console.log('Query params:', { search, category, size, isActive, page, limit, sortBy, sortOrder });
        const queryBuilder = this.breedRepository.createQueryBuilder('breed');
        if (isActive !== undefined) {
            queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
        }
        else {
            queryBuilder.andWhere('breed.isActive = :isActive', { isActive: true });
        }
        if (search) {
            queryBuilder.andWhere('(breed.name ILIKE :search OR breed.description ILIKE :search OR breed.temperament ILIKE :search)', { search: `%${search}%` });
        }
        if (category) {
            queryBuilder.andWhere('breed.category = :category', { category });
        }
        if (size) {
            queryBuilder.andWhere('breed.size = :size', { size });
        }
        queryBuilder.orderBy(`breed.${sortBy}`, sortOrder);
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        console.log('SQL Query:', queryBuilder.getSql());
        console.log('SQL Parameters:', queryBuilder.getParameters());
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
        const breed = await this.breedRepository.findOne({ where: { id } });
        if (!breed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        return breed;
    }
    async findBySlug(slug) {
        const breed = await this.breedRepository.findOne({ where: { slug } });
        if (!breed) {
            throw new common_1.NotFoundException(`Breed with slug ${slug} not found`);
        }
        return breed;
    }
    async findActiveBreeds() {
        return this.breedRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }
    async findBreedsByCategory(category) {
        return this.breedRepository.find({
            where: { category, isActive: true },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }
    async findCategories() {
        const result = await this.breedRepository
            .createQueryBuilder('breed')
            .select('DISTINCT breed.category', 'category')
            .where('breed.category IS NOT NULL')
            .andWhere('breed.isActive = :isActive', { isActive: true })
            .orderBy('breed.category', 'ASC')
            .getRawMany();
        return result.map(item => item.category);
    }
    async findSizes() {
        const result = await this.breedRepository
            .createQueryBuilder('breed')
            .select('DISTINCT breed.size', 'size')
            .where('breed.size IS NOT NULL')
            .andWhere('breed.isActive = :isActive', { isActive: true })
            .orderBy('breed.size', 'ASC')
            .getRawMany();
        return result.map(item => item.size);
    }
    async create(createBreedDto) {
        const existingBreedByName = await this.breedRepository.findOne({ where: { name: createBreedDto.name } });
        if (existingBreedByName) {
            throw new common_1.ConflictException(`Breed with name '${createBreedDto.name}' already exists`);
        }
        const existingBreedBySlug = await this.breedRepository.findOne({ where: { slug: createBreedDto.slug } });
        if (existingBreedBySlug) {
            throw new common_1.ConflictException(`Breed with slug '${createBreedDto.slug}' already exists`);
        }
        if (!this.isValidSlug(createBreedDto.slug)) {
            throw new common_1.BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
        }
        const breed = this.breedRepository.create(createBreedDto);
        return this.breedRepository.save(breed);
    }
    async update(id, updateBreedDto) {
        const existingBreed = await this.breedRepository.findOne({ where: { id } });
        if (!existingBreed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        if (updateBreedDto.name && updateBreedDto.name !== existingBreed.name) {
            const breedWithSameName = await this.breedRepository.findOne({ where: { name: updateBreedDto.name } });
            if (breedWithSameName) {
                throw new common_1.ConflictException(`Breed with name '${updateBreedDto.name}' already exists`);
            }
        }
        if (updateBreedDto.slug && updateBreedDto.slug !== existingBreed.slug) {
            const breedWithSameSlug = await this.breedRepository.findOne({ where: { slug: updateBreedDto.slug } });
            if (breedWithSameSlug) {
                throw new common_1.ConflictException(`Breed with slug '${updateBreedDto.slug}' already exists`);
            }
            if (!this.isValidSlug(updateBreedDto.slug)) {
                throw new common_1.BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
            }
        }
        await this.breedRepository.update(id, updateBreedDto);
        const updatedBreed = await this.breedRepository.findOne({ where: { id } });
        if (!updatedBreed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        return updatedBreed;
    }
    async delete(id) {
        const existingBreed = await this.breedRepository.findOne({ where: { id } });
        if (!existingBreed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        await this.breedRepository.update(id, { isActive: false });
    }
    async hardDelete(id) {
        const existingBreed = await this.breedRepository.findOne({ where: { id } });
        if (!existingBreed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        await this.breedRepository.delete(id);
    }
    async searchBreeds(searchTerm) {
        return this.breedRepository.find({
            where: [
                { name: (0, typeorm_2.ILike)(`%${searchTerm}%`), isActive: true },
                { description: (0, typeorm_2.ILike)(`%${searchTerm}%`), isActive: true },
                { temperament: (0, typeorm_2.ILike)(`%${searchTerm}%`), isActive: true },
            ],
            order: { sortOrder: 'ASC', name: 'ASC' },
            take: 20,
        });
    }
    isValidSlug(slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        return slugRegex.test(slug);
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
};
exports.BreedsService = BreedsService;
exports.BreedsService = BreedsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(breed_entity_1.Breed)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BreedsService);
//# sourceMappingURL=breeds.service.js.map