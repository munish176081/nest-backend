declare class IdVerificationDto {
    governmentId: string[];
    selfieWithId: string[];
}
export declare class UpdateUserProfileDto {
    name: string;
    username?: string;
    email: string;
    imageUrl?: string;
    phone: string;
    bio?: string;
    website?: string;
    businessName: string;
    businessABN: string;
    description: string;
    location: string;
    idVerification?: IdVerificationDto;
}
export {};
