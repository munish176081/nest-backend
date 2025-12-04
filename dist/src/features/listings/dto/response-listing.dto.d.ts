import { ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum, ListingAvailabilityEnum } from '../entities/listing.entity';
export declare class ListingResponseDto {
    id: string;
    userId: string;
    type: ListingTypeEnum;
    status: ListingStatusEnum;
    category: ListingCategoryEnum;
    title: string;
    description: string;
    fields: Record<string, any>;
    age: string;
    metadata: Record<string, any>;
    price: number;
    breed: string;
    breedId?: string;
    breedName: string;
    location: string;
    featuredImage: string;
    expiresAt: Date;
    startedOrRenewedAt: Date;
    publishedAt: Date;
    viewCount: number;
    favoriteCount: number;
    contactCount: number;
    isFeatured: boolean;
    isPremium: boolean;
    isActive: boolean;
    seoData: Record<string, any>;
    analytics: Record<string, any>;
    motherInfo: Record<string, any>;
    fatherInfo: Record<string, any>;
    studInfo: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    availability: ListingAvailabilityEnum;
    user?: {
        id: string;
        name: string;
        email: string;
        username: string;
        imageUrl?: string;
    };
}
export declare class ListingSummaryDto {
    id: string;
    type: ListingTypeEnum;
    status: ListingStatusEnum;
    category: ListingCategoryEnum;
    title: string;
    price: number;
    description: string;
    breed: string;
    breedId?: string;
    breedName: string;
    age?: string;
    location: string;
    featuredImage: string;
    metadata: Record<string, any>;
    fields: Record<string, any>;
    viewCount: number;
    favoriteCount: number;
    isFeatured: boolean;
    isPremium: boolean;
    createdAt: Date;
    availability: ListingAvailabilityEnum;
    user?: {
        id: string;
        name: string;
        email: string;
        username: string;
        imageUrl?: string;
    };
    paymentId?: string | null;
    subscriptionId?: string | null;
    expiresAt?: Date;
    isActive?: boolean;
    subscriptionRenewalDate?: Date;
}
export declare class PaginatedListingsResponseDto {
    data: ListingSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
