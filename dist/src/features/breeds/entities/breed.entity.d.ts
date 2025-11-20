import { Listing } from '../../listings/entities/listing.entity';
export declare class Breed {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    size: string;
    temperament: string;
    lifeExpectancy: string;
    isActive: boolean;
    sortOrder: number;
    isFeatured: boolean;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    listings: Listing[];
}
