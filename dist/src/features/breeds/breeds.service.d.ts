import { Repository } from 'typeorm';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { QueryBreedDto } from './dto/query-breed.dto';
import { BreedResponseDto } from './dto/breed-response.dto';
import { Breed } from './entities/breed.entity';
export declare class BreedsService {
    private readonly breedRepository;
    constructor(breedRepository: Repository<Breed>);
    findAll(query: QueryBreedDto): Promise<{
        breeds: Breed[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<Breed>;
    findBySlug(slug: string): Promise<Breed>;
    findActiveBreeds(): Promise<Breed[]>;
    findFeaturedBreeds(): Promise<BreedResponseDto[]>;
    findBreedsByCategory(category: string): Promise<Breed[]>;
    findCategories(): Promise<string[]>;
    findSizes(): Promise<string[]>;
    create(createBreedDto: CreateBreedDto): Promise<Breed>;
    update(id: string, updateBreedDto: UpdateBreedDto): Promise<Breed>;
    delete(id: string): Promise<void>;
    hardDelete(id: string): Promise<void>;
    searchBreeds(searchTerm: string): Promise<Breed[]>;
    private isValidSlug;
    generateSlug(name: string): string;
    importFromCSV(file: Express.Multer.File): Promise<{
        success: boolean;
        message: string;
        imported: number;
        duplicates: number;
        updated: number;
        errors: any[];
    }>;
    private parseCSVLine;
    private parseCSVContent;
    private mapCSVRowToBreed;
    createCategory(category: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private validateCategoryName;
    getFeaturedBreeds(): Promise<BreedResponseDto[]>;
    toggleFeaturedStatus(id: string): Promise<BreedResponseDto>;
}
