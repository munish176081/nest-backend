import { Request } from 'express';
import { ListingsService } from './listings.service';
import { CreateListingDto, UpdateListingDto, QueryListingDto, SearchListingDto } from './dto';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';
export declare class ListingsController {
    private readonly listingsService;
    constructor(listingsService: ListingsService);
    createListing(req: Request, createListingDto: CreateListingDto): Promise<ListingResponseDto>;
    updateListing(req: Request, id: string, updateListingDto: UpdateListingDto): Promise<ListingResponseDto>;
    publishListing(req: Request, id: string): Promise<ListingResponseDto>;
    deleteListing(req: Request, id: string): Promise<void>;
    getUserListings(req: Request, status?: string, includeExpired?: string, includeDrafts?: string): Promise<ListingSummaryDto[]>;
    searchListings(searchDto: SearchListingDto): Promise<PaginatedListingsResponseDto>;
    getListings(queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto>;
    getFeaturedListings(limit?: string): Promise<ListingSummaryDto[]>;
    getPremiumListings(limit?: string): Promise<ListingSummaryDto[]>;
    getMyListingStats(req: Request): Promise<{
        total: number;
        active: number;
        draft: number;
        expired: number;
        featured: number;
        premium: number;
    }>;
    getGlobalListingStats(): Promise<{
        total: number;
        active: number;
        draft: number;
        expired: number;
        featured: number;
        premium: number;
    }>;
    getListingById(id: string, incrementView?: string): Promise<ListingResponseDto>;
    getListingDebug(id: string): Promise<any>;
    incrementFavoriteCount(id: string): Promise<void>;
    decrementFavoriteCount(id: string): Promise<void>;
    incrementContactCount(id: string): Promise<void>;
    reactivateListing(req: Request, id: string, body: {
        subscriptionId?: string;
        paymentId?: string;
    }): Promise<ListingResponseDto>;
    syncListingSubscription(req: Request, id: string): Promise<ListingResponseDto>;
    approveListing(id: string): Promise<ListingResponseDto>;
    rejectListing(id: string, body: {
        reason?: string;
    }): Promise<ListingResponseDto>;
    getAdminListings(queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto>;
}
