import { Repository } from 'typeorm';
import { Breed } from './entities/breed.entity';
import { QueryBreedDto } from './dto/query-breed.dto';
export declare class BreedsRepository {
    private readonly breedRepository;
    constructor(breedRepository: Repository<Breed>);
    findAll(query: QueryBreedDto): Promise<{
        breeds: Breed[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<Breed | null>;
    findBySlug(slug: string): Promise<Breed | null>;
    findByName(name: string): Promise<Breed | null>;
    findActiveBreeds(): Promise<Breed[]>;
    findBreedsByCategory(category: string): Promise<Breed[]>;
    findCategories(): Promise<string[]>;
    findSizes(): Promise<string[]>;
    create(breedData: Partial<Breed>): Promise<Breed>;
    update(id: string, breedData: Partial<Breed>): Promise<Breed | null>;
    delete(id: string): Promise<void>;
    softDelete(id: string): Promise<void>;
}
