import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { AddToWishlistDto, WishlistResponseDto, WishlistStatusDto } from './dto';
import { ListingsService } from '../listings/listings.service';
export declare class WishlistService {
    private wishlistRepository;
    private listingsService;
    constructor(wishlistRepository: Repository<Wishlist>, listingsService: ListingsService);
    addToWishlist(userId: string, addToWishlistDto: AddToWishlistDto): Promise<WishlistResponseDto>;
    removeFromWishlist(userId: string, listingId: string): Promise<void>;
    getUserWishlist(userId: string, page?: number, limit?: number): Promise<{
        items: WishlistResponseDto[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    getWishlistStatus(userId: string, listingIds: string[]): Promise<WishlistStatusDto[]>;
    isInWishlist(userId: string, listingId: string): Promise<boolean>;
}
