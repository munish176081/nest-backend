import { BreedsService } from './breeds.service';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { QueryBreedDto } from './dto/query-breed.dto';
export declare class BreedsController {
    private readonly breedsService;
    constructor(breedsService: BreedsService);
    create(createBreedDto: CreateBreedDto): Promise<import("./entities/breed.entity").Breed>;
    findAll(query: QueryBreedDto): Promise<{
        breeds: import("./entities/breed.entity").Breed[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findActiveBreeds(): Promise<import("./entities/breed.entity").Breed[]>;
    findCategories(): Promise<string[]>;
    findSizes(): Promise<string[]>;
    searchBreeds(searchTerm: string): Promise<import("./entities/breed.entity").Breed[]>;
    findBreedsByCategory(category: string): Promise<import("./entities/breed.entity").Breed[]>;
    findBySlug(slug: string): Promise<import("./entities/breed.entity").Breed>;
    findOne(id: string): Promise<import("./entities/breed.entity").Breed>;
    update(id: string, updateBreedDto: UpdateBreedDto): Promise<import("./entities/breed.entity").Breed>;
    remove(id: string): Promise<void>;
    hardRemove(id: string): Promise<void>;
}
