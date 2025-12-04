export declare class WishlistResponseDto {
    id: string;
    userId: string;
    listingId: string;
    createdAt: Date;
    listing?: {
        id: string;
        title: string;
        price: number;
        breed: string;
        location: string;
        imageUrl?: string;
    };
}
export declare class WishlistStatusDto {
    listingId: string;
    isWishlisted: boolean;
}
