import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { QueryBreedDto } from './dto/query-breed.dto';
import { BreedResponseDto } from './dto/breed-response.dto';
import { Breed } from './entities/breed.entity';

@Injectable()
export class BreedsService {
  constructor(
    @InjectRepository(Breed)
    private readonly breedRepository: Repository<Breed>,
  ) {}

  async findAll(query: QueryBreedDto) {
    const { search, category, size, isActive, page, limit, sortBy, sortOrder } = query;
    
    console.log('Query params:', { search, category, size, isActive, page, limit, sortBy, sortOrder });
    
    const queryBuilder = this.breedRepository.createQueryBuilder('breed');

    // Always ignore soft-deleted rows
    queryBuilder.andWhere('breed.deletedAt IS NULL');

    // Optional visibility filter
    if (isActive !== undefined) {
      queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
    }

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(breed.name ILIKE :search OR breed.description ILIKE :search OR breed.temperament ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('breed.category = :category', { category });
    }

    if (size) {
      queryBuilder.andWhere('breed.size = :size', { size });
    }

    // Apply sorting - add secondary sort by name for deterministic ordering
    queryBuilder.orderBy(`breed.${sortBy}`, sortOrder);
    queryBuilder.addOrderBy('breed.name', 'ASC');

    // Apply pagination
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

  async findById(id: string): Promise<Breed> {
    const breed = await this.breedRepository.findOne({ where: { id } });
    if (!breed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }
    return breed;
  }

  async findBySlug(slug: string): Promise<Breed> {
    const breed = await this.breedRepository.findOne({ where: { slug } });
    if (!breed) {
      throw new NotFoundException(`Breed with slug ${slug} not found`);
    }
    return breed;
  }

  async findActiveBreeds(): Promise<Breed[]> {
    return this.breedRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findFeaturedBreeds(): Promise<BreedResponseDto[]> {
    const breeds = await this.breedRepository.find({
      where: { 
        isActive: true,
        isFeatured: true 
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
      take: 25 // Limit to 25 breeds as requested
    });

    return breeds.map(breed => plainToClass(BreedResponseDto, breed, {
      excludeExtraneousValues: true
    }));
  }

  async findBreedsByCategory(category: string): Promise<Breed[]> {
    return this.breedRepository.find({
      where: { category, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findCategories(): Promise<string[]> {
    const result = await this.breedRepository
      .createQueryBuilder('breed')
      .select('DISTINCT breed.category', 'category')
      .where('breed.category IS NOT NULL')
      .andWhere('breed.deletedAt IS NULL')
      .orderBy('breed.category', 'ASC')
      .getRawMany();

    return result.map(item => item.category);
  }

  async findSizes(): Promise<string[]> {
    const result = await this.breedRepository
      .createQueryBuilder('breed')
      .select('DISTINCT breed.size', 'size')
      .where('breed.size IS NOT NULL')
      .andWhere('breed.deletedAt IS NULL')
      .orderBy('breed.size', 'ASC')
      .getRawMany();

    return result.map(item => item.size);
  }

  async create(createBreedDto: CreateBreedDto): Promise<Breed> {
    // Check if breed with same name already exists (not soft-deleted)
    const existingBreedByName = await this.breedRepository.findOne({ where: { name: createBreedDto.name, deletedAt: null } as any });
    if (existingBreedByName) {
      throw new ConflictException(`Breed with name '${createBreedDto.name}' already exists`);
    }

    // Check if breed with same slug already exists (not soft-deleted)
    const existingBreedBySlug = await this.breedRepository.findOne({ where: { slug: createBreedDto.slug, deletedAt: null } as any });
    if (existingBreedBySlug) {
      throw new ConflictException(`Breed with slug '${createBreedDto.slug}' already exists`);
    }

    // Validate slug format
    if (!this.isValidSlug(createBreedDto.slug)) {
      throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Normalize imageUrl - convert empty string to null
    const normalizedDto = {
      ...createBreedDto,
      imageUrl: createBreedDto.imageUrl?.trim() || null,
    };

    const breed = this.breedRepository.create(normalizedDto);
    return this.breedRepository.save(breed);
  }

  async update(id: string, updateBreedDto: UpdateBreedDto): Promise<Breed> {
    // Check if breed exists
    const existingBreed = await this.breedRepository.findOne({ where: { id } });
    if (!existingBreed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts (ignore soft-deleted rows)
    if (updateBreedDto.name && updateBreedDto.name !== existingBreed.name) {
      const breedWithSameName = await this.breedRepository.findOne({ where: { name: updateBreedDto.name, deletedAt: null } as any });
      if (breedWithSameName) {
        throw new ConflictException(`Breed with name '${updateBreedDto.name}' already exists`);
      }
    }

    // If slug is being updated, check for conflicts (ignore soft-deleted rows)
    if (updateBreedDto.slug && updateBreedDto.slug !== existingBreed.slug) {
      const breedWithSameSlug = await this.breedRepository.findOne({ where: { slug: updateBreedDto.slug, deletedAt: null } as any });
      if (breedWithSameSlug) {
        throw new ConflictException(`Breed with slug '${updateBreedDto.slug}' already exists`);
      }

      // Validate slug format
      if (!this.isValidSlug(updateBreedDto.slug)) {
        throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
      }
    }

    // Normalize imageUrl - convert empty string to null
    const normalizedDto = {
      ...updateBreedDto,
      imageUrl: updateBreedDto.imageUrl !== undefined 
        ? (updateBreedDto.imageUrl?.trim() || null)
        : undefined,
    };

    await this.breedRepository.update(id, normalizedDto);
    const updatedBreed = await this.breedRepository.findOne({ where: { id } });
    if (!updatedBreed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }

    return updatedBreed;
  }

  async delete(id: string): Promise<void> {
    // Check if breed exists
    const existingBreed = await this.breedRepository.findOne({ where: { id } });
    if (!existingBreed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }

    // TODO: Check if breed is being used in any listings before deletion
    // Soft delete: set deletedAt (do not rely on isActive for deletion state)
    await this.breedRepository.update(id, { deletedAt: new Date() } as any);
  }

  async hardDelete(id: string): Promise<void> {
    // Check if breed exists
    const existingBreed = await this.breedRepository.findOne({ where: { id } });
    if (!existingBreed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }

    await this.breedRepository.delete(id);
  }

  async searchBreeds(searchTerm: string): Promise<Breed[]> {
    return this.breedRepository.find({
      where: [
        { name: ILike(`%${searchTerm}%`), deletedAt: null } as any,
        { description: ILike(`%${searchTerm}%`), deletedAt: null } as any,
        { temperament: ILike(`%${searchTerm}%`), deletedAt: null } as any,
      ],
      order: { sortOrder: 'ASC', name: 'ASC' },
      take: 20,
    });
  }

  private isValidSlug(slug: string): boolean {
    // Slug should contain only lowercase letters, numbers, and hyphens
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  }

  // Helper method to generate slug from name
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }

  async importFromCSV(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }

    try {
      const csvContent = file.buffer.toString('utf-8');
      const rows = this.parseCSVContent(csvContent);
      
      if (rows.length < 2) {
        throw new BadRequestException('CSV must contain at least a header row and one data row');
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

      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new BadRequestException(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      const breeds = [];
      const errors = [];
      let imported = 0;
      let updated = 0;
      let duplicates = 0;

      for (let i = 1; i < rows.length; i++) {
        try {
          const values = rows[i];
          
          // Skip empty rows
          if (values.every(v => !v || v.trim() === '')) {
            continue;
          }
          
          if (values.length !== headers.length) {
            errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
            continue;
          }

          const breedData = this.mapCSVRowToBreed(headers, values);
          
          // Validate required fields
          if (!breedData.name || !breedData.slug) {
            errors.push(`Row ${i + 1}: Name and URL Slug are required`);
            continue;
          }

          // Validate field lengths
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

          // Check if breed already exists (including soft-deleted to restore them)
          const existingBreed = await this.breedRepository
            .createQueryBuilder('breed')
            .where(
              '(breed.name = :name OR breed.slug = :slug)',
              { name: breedData.name, slug: breedData.slug }
            )
            .getOne();

          if (existingBreed) {
            // Check if breed is soft-deleted or active
            if (existingBreed.deletedAt === null) {
              // Breed exists and is active - this is a duplicate
              duplicates++;
              continue;
            } else {
              // Breed exists but is soft-deleted - restore and update it
              try {
                // Only update fields that have values, preserve existing values for empty fields
                const updateData: any = {
                  deletedAt: null, // Restore if soft-deleted
                  updatedAt: new Date(),
                };
                
                // Only include fields that have non-empty values
                if (breedData.name) updateData.name = breedData.name;
                if (breedData.slug) updateData.slug = breedData.slug;
                if (breedData.category !== undefined) updateData.category = breedData.category;
                if (breedData.size !== undefined) updateData.size = breedData.size;
                if (breedData.description !== undefined) updateData.description = breedData.description;
                if (breedData.temperament !== undefined) updateData.temperament = breedData.temperament;
                if (breedData.lifeExpectancy !== undefined) updateData.lifeExpectancy = breedData.lifeExpectancy;
                if (breedData.sortOrder !== undefined) updateData.sortOrder = breedData.sortOrder;
                if (breedData.isActive !== undefined) updateData.isActive = breedData.isActive;
                
                await this.breedRepository.update(existingBreed.id, updateData);
                imported++;
                updated++;
              } catch (updateError) {
                errors.push(`Row ${i + 1}: Failed to restore existing breed "${breedData.name}": ${updateError.message}`);
              }
              continue;
            }
          }

          breeds.push(breedData);
          imported++;
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      // Check if we have any breeds to import (either new or updated)
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

      // Bulk insert new breeds (updated breeds are already saved)
      if (breeds.length > 0) {
        await this.breedRepository.save(breeds);
      }

      // Build success message
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

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process CSV: ${error.message}`);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  private parseCSVContent(csvContent: string): string[][] {
    const lines = csvContent.split('\n');
    const result = [];
    let currentLine = '';
    let inQuotes = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're in the middle of a quoted field
      if (inQuotes) {
        currentLine += '\n' + line;
      } else {
        currentLine = line;
      }
      
      // Count quotes in the current line to determine if we're still in quotes
      const quoteCount = (currentLine.match(/"/g) || []).length;
      inQuotes = quoteCount % 2 === 1;
      
      // If we're not in quotes, this line is complete
      if (!inQuotes) {
        if (currentLine.trim()) {
          result.push(this.parseCSVLine(currentLine));
        }
        currentLine = '';
      }
    }
    
    // Handle the last line if it doesn't end with a newline
    if (currentLine.trim()) {
      result.push(this.parseCSVLine(currentLine));
    }
    
    return result;
  }

  private mapCSVRowToBreed(headers: string[], values: string[]): Partial<Breed> {
    const breedData: Partial<Breed> = {};
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = values[i]?.trim();
      
      // Skip empty values
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

  async createCategory(category: string): Promise<{ success: boolean; message: string }> {
    // Validate category name
    const validationResult = this.validateCategoryName(category);
    if (!validationResult.isValid) {
      throw new Error(validationResult.message);
    }

    // Check if category already exists
    const existingCategory = await this.breedRepository.findOne({
      where: { category: category.toLowerCase() }
    });

    if (existingCategory) {
      throw new Error(`Category '${category}' already exists`);
    }

    // Create a placeholder breed entry for this category
    // This ensures the category appears in the categories list
    const placeholderBreed = this.breedRepository.create({
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Category`,
      slug: `category-${category.toLowerCase()}`,
      description: `Placeholder breed for ${category} category`,
      category: category.toLowerCase(),
      isActive: true,
      sortOrder: 999 // High sort order to keep it at the end
    });

    await this.breedRepository.save(placeholderBreed);

    return {
      success: true,
      message: `Category '${category}' created successfully`
    };
  }

  private validateCategoryName(category: string): { isValid: boolean; message: string } {
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

    // Check for valid format: lowercase, alphanumeric, hyphens, underscores only
    const validFormat = /^[a-z0-9_-]+$/.test(trimmedCategory);
    if (!validFormat) {
      return { 
        isValid: false, 
        message: 'Category name must contain only lowercase letters, numbers, hyphens, and underscores' 
      };
    }

    // Check for consecutive special characters
    if (/[-_]{2,}/.test(trimmedCategory)) {
      return { 
        isValid: false, 
        message: 'Category name cannot have consecutive hyphens or underscores' 
      };
    }

    // Check for starting/ending with special characters
    if (/^[-_]|[-_]$/.test(trimmedCategory)) {
      return { 
        isValid: false, 
        message: 'Category name cannot start or end with hyphens or underscores' 
      };
    }

    return { isValid: true, message: 'Valid category name' };
  }

  async getFeaturedBreeds(): Promise<BreedResponseDto[]> {
    const breeds = await this.breedRepository.find({
      where: { 
        isFeatured: true,
        isActive: true 
      },
      order: { sortOrder: 'ASC', name: 'ASC' }
    });

    return breeds.map(breed => plainToClass(BreedResponseDto, breed, {
      excludeExtraneousValues: true
    }));
  }

  async toggleFeaturedStatus(id: string): Promise<BreedResponseDto> {
    const breed = await this.breedRepository.findOne({ where: { id } });
    
    if (!breed) {
      throw new NotFoundException('Breed not found');
    }

    breed.isFeatured = !breed.isFeatured;
    const updatedBreed = await this.breedRepository.save(breed);

    return plainToClass(BreedResponseDto, updatedBreed, {
      excludeExtraneousValues: true
    });
  }
} 