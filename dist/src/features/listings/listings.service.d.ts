import { ListingsRepository } from './listings.repository';
import { CreateListingDto, UpdateListingDto } from './dto';
import { QueryListingDto, SearchListingDto } from './dto/query-listing.dto';
import { ListingStatusEnum, ListingAvailabilityEnum } from './entities/listing.entity';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';
import { BreedsService } from '../breeds/breeds.service';
import { UsersService } from '../accounts/users.service';
export declare class ListingsService {
    private readonly listingsRepository;
    private readonly breedsService;
    private readonly usersService;
    constructor(listingsRepository: ListingsRepository, breedsService: BreedsService, usersService: UsersService);
    createListing(createListingDto: CreateListingDto, userId: string): Promise<ListingResponseDto>;
    updateListing(userId: string, listingId: string, updateListingDto: UpdateListingDto): Promise<ListingResponseDto>;
    updateAvailability(userId: string, listingId: string, availability: ListingAvailabilityEnum): Promise<ListingResponseDto>;
    publishListing(userId: string, listingId: string): Promise<ListingResponseDto>;
    deleteListing(userId: string, listingId: string): Promise<void>;
    getListingById(listingId: string, incrementView?: boolean, userId?: string): Promise<ListingResponseDto>;
    getUserListings(userId: string, options?: {
        status?: ListingStatusEnum;
        includeExpired?: boolean;
        includeDrafts?: boolean;
    }): Promise<ListingSummaryDto[]>;
    searchListings(searchDto: SearchListingDto): Promise<PaginatedListingsResponseDto>;
    getListings(queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto>;
    getFeaturedListings(limit?: number): Promise<ListingSummaryDto[]>;
    getPremiumListings(limit?: number): Promise<ListingSummaryDto[]>;
    incrementFavoriteCount(listingId: string): Promise<void>;
    decrementFavoriteCount(listingId: string): Promise<void>;
    incrementContactCount(listingId: string): Promise<void>;
    getListingStats(userId?: string): Promise<{
        total: number;
        active: number;
        draft: number;
        expired: number;
        featured: number;
        premium: number;
    }>;
    private validateListingTypeAndCategory;
    private processListingFields;
    private calculateExpirationDate;
    private validateRequiredFields;
    private transformToListingResponse;
    private transformToListingSummary;
}
