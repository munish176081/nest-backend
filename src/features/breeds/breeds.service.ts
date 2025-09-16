import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { QueryBreedDto } from './dto/query-breed.dto';
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

    // Default to active breeds if isActive is not specified
    if (isActive !== undefined) {
      queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
    } else {
      queryBuilder.andWhere('breed.isActive = :isActive', { isActive: true });
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

    // Apply sorting
    queryBuilder.orderBy(`breed.${sortBy}`, sortOrder);

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
      .andWhere('breed.isActive = :isActive', { isActive: true })
      .orderBy('breed.category', 'ASC')
      .getRawMany();

    return result.map(item => item.category);
  }

  async findSizes(): Promise<string[]> {
    const result = await this.breedRepository
      .createQueryBuilder('breed')
      .select('DISTINCT breed.size', 'size')
      .where('breed.size IS NOT NULL')
      .andWhere('breed.isActive = :isActive', { isActive: true })
      .orderBy('breed.size', 'ASC')
      .getRawMany();

    return result.map(item => item.size);
  }

  async create(createBreedDto: CreateBreedDto): Promise<Breed> {
    // Check if breed with same name already exists
    const existingBreedByName = await this.breedRepository.findOne({ where: { name: createBreedDto.name } });
    if (existingBreedByName) {
      throw new ConflictException(`Breed with name '${createBreedDto.name}' already exists`);
    }

    // Check if breed with same slug already exists
    const existingBreedBySlug = await this.breedRepository.findOne({ where: { slug: createBreedDto.slug } });
    if (existingBreedBySlug) {
      throw new ConflictException(`Breed with slug '${createBreedDto.slug}' already exists`);
    }

    // Validate slug format
    if (!this.isValidSlug(createBreedDto.slug)) {
      throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    const breed = this.breedRepository.create(createBreedDto);
    return this.breedRepository.save(breed);
  }

  async update(id: string, updateBreedDto: UpdateBreedDto): Promise<Breed> {
    // Check if breed exists
    const existingBreed = await this.breedRepository.findOne({ where: { id } });
    if (!existingBreed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts
    if (updateBreedDto.name && updateBreedDto.name !== existingBreed.name) {
      const breedWithSameName = await this.breedRepository.findOne({ where: { name: updateBreedDto.name } });
      if (breedWithSameName) {
        throw new ConflictException(`Breed with name '${updateBreedDto.name}' already exists`);
      }
    }

    // If slug is being updated, check for conflicts
    if (updateBreedDto.slug && updateBreedDto.slug !== existingBreed.slug) {
      const breedWithSameSlug = await this.breedRepository.findOne({ where: { slug: updateBreedDto.slug } });
      if (breedWithSameSlug) {
        throw new ConflictException(`Breed with slug '${updateBreedDto.slug}' already exists`);
      }

      // Validate slug format
      if (!this.isValidSlug(updateBreedDto.slug)) {
        throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens');
      }
    }

    await this.breedRepository.update(id, updateBreedDto);
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
    // For now, we'll use soft delete
    await this.breedRepository.update(id, { isActive: false });
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
        { name: ILike(`%${searchTerm}%`), isActive: true },
        { description: ILike(`%${searchTerm}%`), isActive: true },
        { temperament: ILike(`%${searchTerm}%`), isActive: true },
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
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new BadRequestException('CSV must contain at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
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

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);
          
          if (values.length !== headers.length) {
            errors.push(`Row ${i + 1}: Column count mismatch`);
            continue;
          }

          const breedData = this.mapCSVRowToBreed(headers, values);
          
          // Validate required fields
          if (!breedData.name || !breedData.slug) {
            errors.push(`Row ${i + 1}: Name and URL Slug are required`);
            continue;
          }

          // Check if breed already exists
          const existingBreed = await this.breedRepository.findOne({
            where: [
              { name: breedData.name },
              { slug: breedData.slug }
            ]
          });

          if (existingBreed) {
            errors.push(`Row ${i + 1}: Breed with name "${breedData.name}" or slug "${breedData.slug}" already exists`);
            continue;
          }

          breeds.push(breedData);
          imported++;
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (breeds.length === 0) {
        return {
          success: false,
          message: 'No valid breeds to import',
          imported: 0,
          errors
        };
      }

      // Bulk insert breeds
      await this.breedRepository.save(breeds);

      return {
        success: true,
        message: `Successfully imported ${imported} breeds`,
        imported,
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

  private mapCSVRowToBreed(headers: string[], values: string[]): Partial<Breed> {
    const breedData: Partial<Breed> = {};
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = values[i]?.trim();
      
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
} 