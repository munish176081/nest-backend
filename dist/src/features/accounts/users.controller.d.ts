import { Request } from 'express';
import { UsersService } from './users.service';
import { ListingsService } from '../listings/listings.service';
import { CreateListingDto } from '../listings/dto/create-listing.dto';
import { ListingResponseDto, ListingSummaryDto } from '../listings/dto/response-listing.dto';
import { UpdateListingDto } from '../listings/dto/update-listing.dto';
import { ListingAvailabilityEnum } from '../listings/entities/listing.entity';
export declare class UsersController {
    private readonly listingsService;
    private readonly usersService;
    constructor(listingsService: ListingsService, usersService: UsersService);
    findCurrenUser(req: Request): Promise<{
        id: string;
        email: string;
        name: string;
        username: string;
        status: import("./entities/account.entity").UserStatusEnum;
        imageUrl: string;
        createdAt: string;
        role: import("./entities/account.entity").UserRoleEnum;
        isSuperAdmin: boolean;
    }>;
    getUserListings(req: Request): Promise<ListingSummaryDto[]>;
    createListing(req: Request, createListingDto: CreateListingDto): Promise<ListingResponseDto>;
    publishListing(req: Request, id: string): Promise<ListingResponseDto>;
    updateListing(req: Request, id: string, updateListingDto: UpdateListingDto): Promise<ListingResponseDto>;
    updateListingAvailability(req: Request, id: string, body: {
        availability: ListingAvailabilityEnum;
    }): Promise<ListingResponseDto>;
    deleteListing(req: Request, id: string): Promise<void>;
    getUserListing(req: Request, id: string): Promise<ListingResponseDto>;
    refreshSession(req: Request): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            name: string;
            username: string;
            status: import("./entities/account.entity").UserStatusEnum;
            imageUrl: string;
            createdAt: string;
            role: import("./entities/account.entity").UserRoleEnum;
            isSuperAdmin: boolean;
        };
    }>;
    migrateUsers(): Promise<{
        message: string;
    }>;
}
