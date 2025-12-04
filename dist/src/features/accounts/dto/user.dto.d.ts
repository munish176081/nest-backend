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
    email2?: string;
    phone2?: string;
    fax?: string;
    address?: string;
    address2?: string;
    zip?: string;
    city?: string;
    state?: string;
    country?: string;
    firstName?: string;
    lastName?: string;
    isImportedFromCsv?: boolean;
    isProfileComplete?: boolean;
    missingRequiredFields?: string[];
    csvOptionalFields?: Record<string, any>;
    createdAt: string;
    status: string;
    role: string;
    isSuperAdmin: boolean;
    get displayName(): string;
}
