import { BreedTypeImagesService } from './breed-type-images.service';
import { BreedsService } from './breeds.service';
import { CreateBreedTypeImageDto } from './dto/create-breed-type-image.dto';
import { UpdateBreedTypeImageDto } from './dto/update-breed-type-image.dto';
export declare class BreedTypeImagesController {
    private readonly breedTypeImagesService;
    private readonly breedsService;
    constructor(breedTypeImagesService: BreedTypeImagesService, breedsService: BreedsService);
    findFeatured(): Promise<import("./entities/breed-type-image.entity").BreedTypeImage[]>;
    findActive(): Promise<import("./entities/breed-type-image.entity").BreedTypeImage[]>;
    createCategory(body: {
        category: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    create(createBreedTypeImageDto: CreateBreedTypeImageDto): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
    findAll(): Promise<import("./entities/breed-type-image.entity").BreedTypeImage[]>;
    findOne(id: string): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
    findByCategory(category: string): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
    update(id: string, updateBreedTypeImageDto: UpdateBreedTypeImageDto): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
    toggleStatus(id: string): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
    remove(id: string): Promise<void>;
    getAvailableCategories(): Promise<{
        category: string;
        hasImage: boolean;
        imageId?: string;
    }[]>;
    getUniqueCategories(): Promise<string[]>;
    createImageForCategory(category: string, body: {
        imageUrl: string;
        title?: string;
        description?: string;
    }): Promise<import("./entities/breed-type-image.entity").BreedTypeImage>;
}
