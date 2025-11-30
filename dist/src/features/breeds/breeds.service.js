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
const class_transformer_1 = require("class-transformer");
const breed_response_dto_1 = require("./dto/breed-response.dto");
const breed_entity_1 = require("./entities/breed.entity");
let BreedsService = class BreedsService {
    constructor(breedRepository) {
        this.breedRepository = breedRepository;
    }
    async findAll(query) {
        const { search, category, size, isActive, page, limit, sortBy, sortOrder } = query;
        console.log('Query params:', { search, category, size, isActive, page, limit, sortBy, sortOrder });
        const queryBuilder = this.breedRepository.createQueryBuilder('breed');
        queryBuilder.andWhere('breed.deletedAt IS NULL');
        if (isActive !== undefined) {
            queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
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
        queryBuilder.addOrderBy('breed.name', 'ASC');
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
    async findFeaturedBreeds() {
        const breeds = await this.breedRepository.find({
            where: {
                isActive: true,
                isFeatured: true
            },
            order: { sortOrder: 'ASC', name: 'ASC' },
            take: 25
        });
        return breeds.map(breed => (0, class_transformer_1.plainToClass)(breed_response_dto_1.BreedResponseDto, breed, {
            excludeExtraneousValues: true
        }));
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
    async create(createBreedDto) {
        const existingBreedByName = await this.breedRepository.findOne({ where: { name: createBreedDto.name, deletedAt: null } });
        if (existingBreedByName) {
            throw new common_1.ConflictException(`Breed with name '${createBreedDto.name}' already exists`);
        }
        const existingBreedBySlug = await this.breedRepository.findOne({ where: { slug: createBreedDto.slug, deletedAt: null } });
        if (existingBreedBySlug) {
            throw new common_1.ConflictException(`Breed with slug '${createBreedDto.slug}' already exists`);
        }
        if (!this.isValidSlug(createBreedDto.slug)) {
            throw new common_1.BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
        }
        const normalizedDto = {
            ...createBreedDto,
            imageUrl: createBreedDto.imageUrl?.trim() || null,
        };
        const breed = this.breedRepository.create(normalizedDto);
        return this.breedRepository.save(breed);
    }
    async update(id, updateBreedDto) {
        const existingBreed = await this.breedRepository.findOne({ where: { id } });
        if (!existingBreed) {
            throw new common_1.NotFoundException(`Breed with ID ${id} not found`);
        }
        if (updateBreedDto.name && updateBreedDto.name !== existingBreed.name) {
            const breedWithSameName = await this.breedRepository.findOne({ where: { name: updateBreedDto.name, deletedAt: null } });
            if (breedWithSameName) {
                throw new common_1.ConflictException(`Breed with name '${updateBreedDto.name}' already exists`);
            }
        }
        if (updateBreedDto.slug && updateBreedDto.slug !== existingBreed.slug) {
            const breedWithSameSlug = await this.breedRepository.findOne({ where: { slug: updateBreedDto.slug, deletedAt: null } });
            if (breedWithSameSlug) {
                throw new common_1.ConflictException(`Breed with slug '${updateBreedDto.slug}' already exists`);
            }
            if (!this.isValidSlug(updateBreedDto.slug)) {
                throw new common_1.BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
            }
        }
        const normalizedDto = {
            ...updateBreedDto,
            imageUrl: updateBreedDto.imageUrl !== undefined
                ? (updateBreedDto.imageUrl?.trim() || null)
                : undefined,
        };
        await this.breedRepository.update(id, normalizedDto);
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
        await this.breedRepository.update(id, { deletedAt: new Date() });
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
                { name: (0, typeorm_2.ILike)(`%${searchTerm}%`), deletedAt: null },
                { description: (0, typeorm_2.ILike)(`%${searchTerm}%`), deletedAt: null },
                { temperament: (0, typeorm_2.ILike)(`%${searchTerm}%`), deletedAt: null },
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
    async importFromCSV(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
            throw new common_1.BadRequestException('File must be a CSV');
        }
        try {
            const csvContent = file.buffer.toString('utf-8');
            const rows = this.parseCSVContent(csvContent);
            if (rows.length < 2) {
                throw new common_1.BadRequestException('CSV must contain at least a header row and one data row');
            }
            const headers = rows[0].map(h => h.trim().replace(/"/g, ''));
            const expectedHeaders = [
                'Breed Name',
                'Category',
                'URL Slug',
                'Size',
                'Breed Description',
                'Temperament',
                'Life Expectancy',
                'Sort Order'
            ];
            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new common_1.BadRequestException(`Missing required headers: ${missingHeaders.join(', ')}`);
            }
            const breeds = [];
            const errors = [];
            let imported = 0;
            let updated = 0;
            let duplicates = 0;
            for (let i = 1; i < rows.length; i++) {
                try {
                    const values = rows[i];
                    if (values.every(v => !v || v.trim() === '')) {
                        continue;
                    }
                    if (values.length !== headers.length) {
                        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                        continue;
                    }
                    const breedData = this.mapCSVRowToBreed(headers, values);
                    if (!breedData.name || !breedData.slug) {
                        errors.push(`Row ${i + 1}: Name and URL Slug are required`);
                        continue;
                    }
                    if (breedData.name && breedData.name.length > 255) {
                        errors.push(`Row ${i + 1}: Name is too long (max 255 characters)`);
                        continue;
                    }
                    if (breedData.slug && breedData.slug.length > 255) {
                        errors.push(`Row ${i + 1}: URL Slug is too long (max 255 characters)`);
                        continue;
                    }
                    if (breedData.category && breedData.category.length > 100) {
                        errors.push(`Row ${i + 1}: Category is too long (max 100 characters)`);
                        continue;
                    }
                    if (breedData.size && breedData.size.length > 50) {
                        errors.push(`Row ${i + 1}: Size is too long (max 50 characters)`);
                        continue;
                    }
                    if (breedData.lifeExpectancy && breedData.lifeExpectancy.length > 50) {
                        errors.push(`Row ${i + 1}: Life Expectancy is too long (max 50 characters)`);
                        continue;
                    }
                    const existingBreed = await this.breedRepository
                        .createQueryBuilder('breed')
                        .where('(breed.name = :name OR breed.slug = :slug)', { name: breedData.name, slug: breedData.slug })
                        .getOne();
                    if (existingBreed) {
                        if (existingBreed.deletedAt === null) {
                            duplicates++;
                            continue;
                        }
                        else {
                            try {
                                const updateData = {
                                    deletedAt: null,
                                    updatedAt: new Date(),
                                };
                                if (breedData.name)
                                    updateData.name = breedData.name;
                                if (breedData.slug)
                                    updateData.slug = breedData.slug;
                                if (breedData.category !== undefined)
                                    updateData.category = breedData.category;
                                if (breedData.size !== undefined)
                                    updateData.size = breedData.size;
                                if (breedData.description !== undefined)
                                    updateData.description = breedData.description;
                                if (breedData.temperament !== undefined)
                                    updateData.temperament = breedData.temperament;
                                if (breedData.lifeExpectancy !== undefined)
                                    updateData.lifeExpectancy = breedData.lifeExpectancy;
                                if (breedData.sortOrder !== undefined)
                                    updateData.sortOrder = breedData.sortOrder;
                                if (breedData.isActive !== undefined)
                                    updateData.isActive = breedData.isActive;
                                await this.breedRepository.update(existingBreed.id, updateData);
                                imported++;
                                updated++;
                            }
                            catch (updateError) {
                                errors.push(`Row ${i + 1}: Failed to restore existing breed "${breedData.name}": ${updateError.message}`);
                            }
                            continue;
                        }
                    }
                    breeds.push(breedData);
                    imported++;
                }
                catch (error) {
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }
            if (imported === 0 && duplicates === 0) {
                return {
                    success: false,
                    message: 'No valid breeds to import',
                    imported: 0,
                    duplicates: 0,
                    updated: 0,
                    errors
                };
            }
            if (breeds.length > 0) {
                await this.breedRepository.save(breeds);
            }
            const parts = [];
            if (imported - updated > 0) {
                parts.push(`${imported - updated} new breed${imported - updated !== 1 ? 's' : ''}`);
            }
            if (updated > 0) {
                parts.push(`${updated} breed${updated !== 1 ? 's' : ''} restored`);
            }
            if (duplicates > 0) {
                parts.push(`${duplicates} duplicate${duplicates !== 1 ? 's' : ''} found`);
            }
            const message = parts.length > 0
                ? `Successfully imported ${imported} breed${imported !== 1 ? 's' : ''}. ${parts.join(', ')}.`
                : `Successfully imported ${imported} breed${imported !== 1 ? 's' : ''}`;
            return {
                success: true,
                message,
                imported,
                duplicates,
                updated,
                errors
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to process CSV: ${error.message}`);
        }
    }
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(v => v.replace(/^"|"$/g, ''));
    }
    parseCSVContent(csvContent) {
        const lines = csvContent.split('\n');
        const result = [];
        let currentLine = '';
        let inQuotes = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (inQuotes) {
                currentLine += '\n' + line;
            }
            else {
                currentLine = line;
            }
            const quoteCount = (currentLine.match(/"/g) || []).length;
            inQuotes = quoteCount % 2 === 1;
            if (!inQuotes) {
                if (currentLine.trim()) {
                    result.push(this.parseCSVLine(currentLine));
                }
                currentLine = '';
            }
        }
        if (currentLine.trim()) {
            result.push(this.parseCSVLine(currentLine));
        }
        return result;
    }
    mapCSVRowToBreed(headers, values) {
        const breedData = {};
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const value = values[i]?.trim();
            if (!value || value === '') {
                continue;
            }
            switch (header) {
                case 'Breed Name':
                    breedData.name = value;
                    break;
                case 'Category':
                    breedData.category = value || null;
                    break;
                case 'URL Slug':
                    breedData.slug = value;
                    break;
                case 'Size':
                    breedData.size = value || null;
                    break;
                case 'Breed Description':
                    breedData.description = value || null;
                    break;
                case 'Temperament':
                    breedData.temperament = value || null;
                    break;
                case 'Life Expectancy':
                    breedData.lifeExpectancy = value || null;
                    break;
                case 'Sort Order':
                    breedData.sortOrder = value ? parseInt(value, 10) || 0 : 0;
                    break;
            }
        }
        breedData.isActive = true;
        return breedData;
    }
    async createCategory(category) {
        const validationResult = this.validateCategoryName(category);
        if (!validationResult.isValid) {
            throw new Error(validationResult.message);
        }
        const existingCategory = await this.breedRepository.findOne({
            where: { category: category.toLowerCase() }
        });
        if (existingCategory) {
            throw new Error(`Category '${category}' already exists`);
        }
        const placeholderBreed = this.breedRepository.create({
            name: `${category.charAt(0).toUpperCase() + category.slice(1)} Category`,
            slug: `category-${category.toLowerCase()}`,
            description: `Placeholder breed for ${category} category`,
            category: category.toLowerCase(),
            isActive: true,
            sortOrder: 999
        });
        await this.breedRepository.save(placeholderBreed);
        return {
            success: true,
            message: `Category '${category}' created successfully`
        };
    }
    validateCategoryName(category) {
        if (!category || typeof category !== 'string') {
            return { isValid: false, message: 'Category name is required' };
        }
        const trimmedCategory = category.trim();
        if (trimmedCategory.length < 3) {
            return { isValid: false, message: 'Category name must be at least 3 characters long' };
        }
        if (trimmedCategory.length > 50) {
            return { isValid: false, message: 'Category name must be less than 50 characters' };
        }
        const validFormat = /^[a-z0-9_-]+$/.test(trimmedCategory);
        if (!validFormat) {
            return {
                isValid: false,
                message: 'Category name must contain only lowercase letters, numbers, hyphens, and underscores'
            };
        }
        if (/[-_]{2,}/.test(trimmedCategory)) {
            return {
                isValid: false,
                message: 'Category name cannot have consecutive hyphens or underscores'
            };
        }
        if (/^[-_]|[-_]$/.test(trimmedCategory)) {
            return {
                isValid: false,
                message: 'Category name cannot start or end with hyphens or underscores'
            };
        }
        return { isValid: true, message: 'Valid category name' };
    }
    async getFeaturedBreeds() {
        const breeds = await this.breedRepository.find({
            where: {
                isFeatured: true,
                isActive: true
            },
            order: { sortOrder: 'ASC', name: 'ASC' }
        });
        return breeds.map(breed => (0, class_transformer_1.plainToClass)(breed_response_dto_1.BreedResponseDto, breed, {
            excludeExtraneousValues: true
        }));
    }
    async toggleFeaturedStatus(id) {
        const breed = await this.breedRepository.findOne({ where: { id } });
        if (!breed) {
            throw new common_1.NotFoundException('Breed not found');
        }
        breed.isFeatured = !breed.isFeatured;
        const updatedBreed = await this.breedRepository.save(breed);
        return (0, class_transformer_1.plainToClass)(breed_response_dto_1.BreedResponseDto, updatedBreed, {
            excludeExtraneousValues: true
        });
    }
};
exports.BreedsService = BreedsService;
exports.BreedsService = BreedsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(breed_entity_1.Breed)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BreedsService);
//# sourceMappingURL=breeds.service.js.map