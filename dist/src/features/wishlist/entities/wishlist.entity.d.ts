import { User } from '../../accounts/entities/account.entity';
import { Listing } from '../../listings/entities/listing.entity';
export declare class Wishlist {
    id: string;
    userId: string;
    listingId: string;
    createdAt: Date;
    user: User;
    listing: Listing;
}
