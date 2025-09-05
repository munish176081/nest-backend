import { BreedsService } from './breeds.service';
export declare class BreedsSeedService {
    private readonly breedsService;
    constructor(breedsService: BreedsService);
    seedBreeds(): Promise<any[]>;
    clearBreeds(): Promise<void>;
}
