import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto';
export declare class WishlistController {
    private readonly wishlistService;
    constructor(wishlistService: WishlistService);
    addToWishlist(addToWishlistDto: AddToWishlistDto, req: any): Promise<import("./dto").WishlistResponseDto>;
    removeFromWishlist(listingId: string, req: any): Promise<{
        message: string;
    }>;
    getUserWishlist(page: string, limit: string, req: any): Promise<{
        items: import("./dto").WishlistResponseDto[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    getWishlistStatus(listingIds: string, req: any): Promise<import("./dto").WishlistStatusDto[]>;
    checkWishlistStatus(listingId: string, req: any): Promise<{
        isWishlisted: boolean;
    }>;
}
