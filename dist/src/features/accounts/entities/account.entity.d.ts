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
    phone?: string;
    bio?: string;
    website?: string;
    businessName?: string;
    businessABN?: string;
    description?: string;
    location?: string;
    idVerification?: {
        governmentId: string[];
        selfieWithId: string[];
    };
    ip?: string;
    hashedPassword?: string;
    externalAccounts: any[];
    listings: any[];
    createdAt: string;
    updatedAt: string;
}
