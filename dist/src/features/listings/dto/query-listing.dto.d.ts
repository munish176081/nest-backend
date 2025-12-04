import { ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum } from '../entities/listing.entity';
export declare class QueryListingDto {
    search?: string;
    type?: ListingTypeEnum;
    types?: ListingTypeEnum[];
    category?: ListingCategoryEnum;
    status?: ListingStatusEnum;
    breed?: string;
    location?: string;
    gender?: 'stud' | 'bitch';
    minPrice?: number;
    maxPrice?: number;
    priceType?: 'price_on_request' | 'price_range' | 'price_available';
    priceTypes?: ('price_on_request' | 'price_range' | 'price_available')[];
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
    excludeFeaturedSubscriptions?: boolean;
}
export declare class SearchListingDto {
    query: string;
    type?: ListingTypeEnum;
    category?: ListingCategoryEnum;
    location?: string;
    priceType?: 'price_on_request' | 'price_range' | 'price_available';
    priceTypes?: ('price_on_request' | 'price_range' | 'price_available')[];
    page?: number;
    limit?: number;
}
