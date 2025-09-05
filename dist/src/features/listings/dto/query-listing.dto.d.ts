import { ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum } from '../entities/listing.entity';
export declare class QueryListingDto {
    search?: string;
    type?: ListingTypeEnum;
    category?: ListingCategoryEnum;
    status?: ListingStatusEnum;
    breed?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    isFeatured?: boolean;
    isPremium?: boolean;
    tags?: string[];
    userId?: string;
    excludeId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'viewCount' | 'favoriteCount';
    sortOrder?: 'ASC' | 'DESC';
    includeExpired?: boolean;
    includeDrafts?: boolean;
}
export declare class SearchListingDto {
    query: string;
    type?: ListingTypeEnum;
    category?: ListingCategoryEnum;
    location?: string;
    page?: number;
    limit?: number;
}
