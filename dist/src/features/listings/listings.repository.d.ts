import { Repository } from 'typeorm';
import { Listing, ListingStatusEnum } from './entities/listing.entity';
import { QueryListingDto } from './dto/query-listing.dto';
import { SearchListingDto } from './dto/query-listing.dto';
import { Subscription } from '../subscriptions/entities/subscription.entity';
export declare class ListingsRepository {
    private readonly listingRepository;
    private readonly subscriptionRepository;
    constructor(listingRepository: Repository<Listing>, subscriptionRepository: Repository<Subscription>);
    create(listingData: Partial<Listing>): Promise<Listing>;
    findById(id: string, includeUser?: boolean): Promise<Listing | null>;
    findByUserId(userId: string, options?: {
        status?: ListingStatusEnum;
        includeExpired?: boolean;
        includeDrafts?: boolean;
    }): Promise<(Listing & {
        subscriptionRenewalDate?: Date;
    })[]>;
    findActiveListings(queryDto: QueryListingDto): Promise<{
        listings: Listing[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAdminListings(queryDto: QueryListingDto): Promise<{
        listings: Listing[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    searchListings(searchDto: SearchListingDto): Promise<{
        listings: Listing[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    update(id: string, updateData: Partial<Listing>): Promise<Listing | null>;
    delete(id: string): Promise<void>;
    softDelete(id: string): Promise<void>;
    incrementViewCount(id: string): Promise<void>;
    incrementFavoriteCount(id: string): Promise<void>;
    decrementFavoriteCount(id: string): Promise<void>;
    incrementContactCount(id: string): Promise<void>;
    findExpiredListings(): Promise<Listing[]>;
    findFeaturedListings(limit?: number): Promise<Listing[]>;
    findPremiumListings(limit?: number): Promise<Listing[]>;
    getListingStats(userId?: string): Promise<{
        total: number;
        active: number;
        draft: number;
        expired: number;
        featured: number;
        premium: number;
    }>;
    private buildQueryBuilder;
    private buildAdminQueryBuilder;
}
