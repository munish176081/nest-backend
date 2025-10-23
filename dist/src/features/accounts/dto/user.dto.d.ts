export declare class UserDto {
    id: string;
    email: string;
    name: string;
    username: string;
    imageUrl: string;
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
    createdAt: string;
    status: string;
    role: string;
    isSuperAdmin: boolean;
    get displayName(): string;
}
