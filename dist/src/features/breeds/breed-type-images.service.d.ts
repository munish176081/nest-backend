import { Repository } from 'typeorm';
import { CreateBreedTypeImageDto } from './dto/create-breed-type-image.dto';
import { UpdateBreedTypeImageDto } from './dto/update-breed-type-image.dto';
import { BreedTypeImage } from './entities/breed-type-image.entity';
import { Breed } from './entities/breed.entity';
export declare class BreedTypeImagesService {
    private readonly breedTypeImageRepository;
    private readonly breedRepository;
    constructor(breedTypeImageRepository: Repository<BreedTypeImage>, breedRepository: Repository<Breed>);
    create(createBreedTypeImageDto: CreateBreedTypeImageDto): Promise<BreedTypeImage>;
    findAll(): Promise<BreedTypeImage[]>;
    findActive(): Promise<BreedTypeImage[]>;
    findOne(id: string): Promise<BreedTypeImage>;
    findByCategory(category: string): Promise<BreedTypeImage>;
    update(id: string, updateBreedTypeImageDto: UpdateBreedTypeImageDto): Promise<BreedTypeImage>;
    remove(id: string): Promise<void>;
    toggleStatus(id: string): Promise<BreedTypeImage>;
    getUniqueCategoriesFromBreeds(): Promise<string[]>;
    getAvailableCategoriesForImages(): Promise<{
        category: string;
        hasImage: boolean;
        imageId?: string;
    }[]>;
    createImageForCategory(category: string, imageUrl: string, title?: string, description?: string): Promise<BreedTypeImage>;
}
