import { ExternalAuthAccount } from 'src/features/authentication/entities/external-auth-accounts.entity';
import { Listing } from 'src/features/listings/entities/listing.entity';
export type UserStatusEnum = 'not_verified' | 'suspended' | 'active';
export declare class User {
    id: string;
    email: string;
    name: string;
    username: string;
    status: UserStatusEnum;
    imageUrl?: string;
    ip?: string;
    hashedPassword?: string;
    externalAccounts: ExternalAuthAccount[];
    listings: Listing[];
    createdAt: string;
    updatedAt: string;
}
