import { User } from '../../accounts/entities/account.entity';
import { Breed } from '../../breeds/entities/breed.entity';
export declare enum ListingTypeEnum {
    SEMEN_LISTING = "SEMEN_LISTING",
    PUPPY_LISTING = "PUPPY_LISTING",
    PUPPY_LITTER_LISTING = "PUPPY_LITTER_LISTING",
    LITTER_LISTING = "LITTER_LISTING",
    STUD_LISTING = "STUD_LISTING",
    FUTURE_LISTING = "FUTURE_LISTING",
    WANTED_LISTING = "WANTED_LISTING",
    OTHER_SERVICES = "OTHER_SERVICES"
}
export declare enum ListingStatusEnum {
    DRAFT = "draft",
    PENDING_REVIEW = "pending_review",
    ACTIVE = "active",
    EXPIRED = "expired",
    SUSPENDED = "suspended",
    DELETED = "deleted"
}
export declare enum ListingCategoryEnum {
    BREEDING = "breeding",
    PUPPY = "puppy",
    SERVICE = "service",
    WANTED = "wanted"
}
export declare enum ListingAvailabilityEnum {
    AVAILABLE = "available",
    RESERVED = "reserved",
    SOLD_OUT = "sold_out",
    DRAFT = "draft"
}
export declare class Listing {
    id: string;
    userId: string;
    type: ListingTypeEnum;
    status: ListingStatusEnum;
    availability: ListingAvailabilityEnum;
    category: ListingCategoryEnum;
    title: string;
    description: string;
    fields: Record<string, any>;
    metadata: {
        price?: number;
        breed?: string;
        location?: string;
        contactInfo?: {
            name?: string;
            email?: string;
            phone?: string;
            location?: string;
        };
        images?: string[];
        videos?: string[];
        documents?: string[];
        motherImages?: string[];
        fatherImages?: string[];
        studImages?: string[];
        motherVideos?: string[];
        fatherVideos?: string[];
        studVideos?: string[];
        tags?: string[];
        featured?: boolean;
        premium?: boolean;
        views?: number;
        favorites?: number;
        [key: string]: any;
    };
    motherInfo: {
        name?: string;
        breed?: string;
        color?: string;
        weight?: string;
        temperament?: string;
        healthInfo?: string;
    };
    fatherInfo: {
        name?: string;
        breed?: string;
        color?: string;
        weight?: string;
        temperament?: string;
        healthInfo?: string;
    };
    studInfo: {
        name?: string;
        breed?: string;
        color?: string;
        weight?: string;
        temperament?: string;
        healthInfo?: string;
    };
    price: number;
    breed: string;
    breedId: string;
    location: string;
    expiresAt: Date;
    startedOrRenewedAt: Date;
    publishedAt: Date;
    suspendedAt: Date;
    suspensionReason: string;
    viewCount: number;
    favoriteCount: number;
    contactCount: number;
    isFeatured: boolean;
    isPremium: boolean;
    isActive: boolean;
    isImportedFromCsv: boolean;
    paymentId: string | null;
    subscriptionId: string | null;
    seoData: {
        slug?: string;
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
    };
    analytics: {
        lastViewedAt?: Date;
        lastContactedAt?: Date;
        viewHistory?: Array<{
            date: Date;
            count: number;
        }>;
        contactHistory?: Array<{
            date: Date;
            count: number;
        }>;
    };
    user: User;
    breedRelation: Breed;
    createdAt: Date;
    updatedAt: Date;
}
