import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBreedTypeImageDto } from './dto/create-breed-type-image.dto';
import { UpdateBreedTypeImageDto } from './dto/update-breed-type-image.dto';
import { BreedTypeImage } from './entities/breed-type-image.entity';
import { Breed } from './entities/breed.entity';

@Injectable()
export class BreedTypeImagesService {
  constructor(
    @InjectRepository(BreedTypeImage)
    private readonly breedTypeImageRepository: Repository<BreedTypeImage>,
    @InjectRepository(Breed)
    private readonly breedRepository: Repository<Breed>,
  ) {}

  async create(createBreedTypeImageDto: CreateBreedTypeImageDto): Promise<BreedTypeImage> {
    // Check if category already exists
    const existing = await this.breedTypeImageRepository.findOne({
      where: { category: createBreedTypeImageDto.category }
    });

    if (existing) {
      throw new ConflictException(`Breed type image for category '${createBreedTypeImageDto.category}' already exists`);
    }

    const breedTypeImage = this.breedTypeImageRepository.create(createBreedTypeImageDto);
    return await this.breedTypeImageRepository.save(breedTypeImage);
  }

  async findAll(): Promise<BreedTypeImage[]> {
    return await this.breedTypeImageRepository.find({
      order: { sortOrder: 'ASC', category: 'ASC' }
    });
  }

  async findActive(): Promise<BreedTypeImage[]> {
    return await this.breedTypeImageRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', category: 'ASC' }
    });
  }

  async findOne(id: string): Promise<BreedTypeImage> {
    const breedTypeImage = await this.breedTypeImageRepository.findOne({
      where: { id }
    });

    if (!breedTypeImage) {
      throw new NotFoundException(`Breed type image with ID '${id}' not found`);
    }

    return breedTypeImage;
  }

  async findByCategory(category: string): Promise<BreedTypeImage> {
    const breedTypeImage = await this.breedTypeImageRepository.findOne({
      where: { category }
    });

    if (!breedTypeImage) {
      throw new NotFoundException(`Breed type image for category '${category}' not found`);
    }

    return breedTypeImage;
  }

  async update(id: string, updateBreedTypeImageDto: UpdateBreedTypeImageDto): Promise<BreedTypeImage> {
    const breedTypeImage = await this.findOne(id);

    // If updating category, check if new category already exists
    if (updateBreedTypeImageDto.category && updateBreedTypeImageDto.category !== breedTypeImage.category) {
      const existing = await this.breedTypeImageRepository.findOne({
        where: { category: updateBreedTypeImageDto.category }
      });

      if (existing) {
        throw new ConflictException(`Breed type image for category '${updateBreedTypeImageDto.category}' already exists`);
      }
    }

    Object.assign(breedTypeImage, updateBreedTypeImageDto);
    return await this.breedTypeImageRepository.save(breedTypeImage);
  }

  async remove(id: string): Promise<void> {
    const breedTypeImage = await this.findOne(id);
    await this.breedTypeImageRepository.remove(breedTypeImage);
  }

  async toggleStatus(id: string): Promise<BreedTypeImage> {
    const breedTypeImage = await this.findOne(id);
    breedTypeImage.isActive = !breedTypeImage.isActive;
    return await this.breedTypeImageRepository.save(breedTypeImage);
  }

  async getUniqueCategoriesFromBreeds(): Promise<string[]> {
    const result = await this.breedRepository
      .createQueryBuilder('breed')
      .select('DISTINCT LOWER(breed.category)', 'category')
      .where('breed.category IS NOT NULL')
      .andWhere('breed.category != :empty', { empty: '' })
      .orderBy('LOWER(breed.category)', 'ASC')
      .getRawMany();

    return result.map(row => row.category).filter(category => category);
  }

  async getAvailableCategoriesForImages(): Promise<{ category: string; hasImage: boolean; imageId?: string }[]> {
    const uniqueCategories = await this.getUniqueCategoriesFromBreeds();
    const existingImages = await this.breedTypeImageRepository.find({
      select: ['id', 'category']
    });

    // Create case-insensitive maps for comparison
    const existingCategories = new Set(existingImages.map(img => img.category.toLowerCase()));
    const imageMap = new Map(existingImages.map(img => [img.category.toLowerCase(), img.id]));

    return uniqueCategories.map(category => ({
      category,
      hasImage: existingCategories.has(category.toLowerCase()),
      imageId: imageMap.get(category.toLowerCase())
    }));
  }

  async createImageForCategory(category: string, imageUrl: string, title?: string, description?: string): Promise<BreedTypeImage> {
    // Check if category exists in breeds (case-insensitive)
    const breedExists = await this.breedRepository.findOne({
      where: { category: category.toLowerCase() }
    });

    if (!breedExists) {
      throw new NotFoundException(`Category '${category}' not found in breeds table`);
    }

    // Check if image already exists for this category (case-insensitive)
    const existing = await this.breedTypeImageRepository.findOne({
      where: { category: category.toLowerCase() }
    });

    if (existing) {
      throw new ConflictException(`Breed type image for category '${category}' already exists`);
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
}
