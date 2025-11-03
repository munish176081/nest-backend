import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Breed } from './entities/breed.entity';
import { QueryBreedDto } from './dto/query-breed.dto';

@Injectable()
export class BreedsRepository {
  constructor(
    @InjectRepository(Breed)
    private readonly breedRepository: Repository<Breed>,
  ) {}

  async findAll(query: QueryBreedDto) {
    const { search, category, size, isActive, page, limit, sortBy, sortOrder } = query;
    
    const queryBuilder = this.breedRepository.createQueryBuilder('breed');
    queryBuilder.andWhere('breed.deletedAt IS NULL');

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

    if (isActive !== undefined) {
      queryBuilder.andWhere('breed.isActive = :isActive', { isActive });
    }

    // Apply sorting
    queryBuilder.orderBy(`breed.${sortBy}`, sortOrder);

    // Apply pagination
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

  async findById(id: string): Promise<Breed | null> {
    return this.breedRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Breed | null> {
    return this.breedRepository.findOne({ where: { slug } });
  }

  async findByName(name: string): Promise<Breed | null> {
    return this.breedRepository.findOne({ where: { name } });
  }

  async findActiveBreeds(): Promise<Breed[]> {
    return this.breedRepository.find({
      where: { isActive: true, deletedAt: null } as any,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findBreedsByCategory(category: string): Promise<Breed[]> {
    return this.breedRepository.find({
      where: { category, isActive: true, deletedAt: null } as any,
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

  async create(breedData: Partial<Breed>): Promise<Breed> {
    const breed = this.breedRepository.create(breedData);
    return this.breedRepository.save(breed);
  }

  async update(id: string, breedData: Partial<Breed>): Promise<Breed | null> {
    await this.breedRepository.update(id, breedData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.breedRepository.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.breedRepository.update(id, { deletedAt: new Date() } as any);
  }
} 