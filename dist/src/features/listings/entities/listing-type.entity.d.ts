export declare class ListingType {
    id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    price: number;
    requiredFields: Record<string, any>[];
    optionalFields: Record<string, any>[];
    isActive: boolean;
    defaultExpirationDays: number;
    createdAt: Date;
    updatedAt: Date;
}
