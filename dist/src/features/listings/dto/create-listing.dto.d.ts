import { ListingTypeEnum, ListingCategoryEnum, ListingAvailabilityEnum, ListingStatusEnum } from '../entities/listing.entity';
export declare class ContactInfoDto {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
}
export declare class SeoDataDto {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
}
export declare class ParentInfoDto {
    name?: string;
    breed?: string;
    color?: string;
    weight?: string;
    temperament?: string;
    healthInfo?: string;
}
export declare class CreateListingDto {
    title: string;
    description?: string;
    type: ListingTypeEnum;
    category: ListingCategoryEnum;
    availability?: ListingAvailabilityEnum;
    fields?: Record<string, any>;
    price?: number;
    breed?: string;
    breedId?: string;
    location?: string;
    expiresAt?: string;
    contactInfo?: ContactInfoDto;
    images?: string[];
    videos?: string[];
    documents?: string[];
    tags?: string[];
    isFeatured?: boolean;
    isPremium?: boolean;
    seoData?: SeoDataDto;
    motherInfo?: ParentInfoDto;
    fatherInfo?: ParentInfoDto;
    studInfo?: ParentInfoDto;
    metadata?: Record<string, any>;
    paymentId?: string;
    subscriptionId?: string;
    status?: ListingStatusEnum;
}
