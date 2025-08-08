import { ExternalAuthAccount } from '../../authentication/entities/external-auth-accounts.entity';
import { Listing } from '../../listings/entities/listing.entity';
export type UserStatusEnum = 'not_verified' | 'suspended' | 'active';
export type UserRoleEnum = 'user' | 'admin' | 'super_admin';
export declare class User {
    id: string;
    email: string;
    name: string;
    username: string;
    status: UserStatusEnum;
    role: UserRoleEnum;
    isSuperAdmin: boolean;
    imageUrl?: string;
    ip?: string;
    hashedPassword?: string;
    externalAccounts: ExternalAuthAccount[];
    listings: Listing[];
    createdAt: string;
    updatedAt: string;
}
