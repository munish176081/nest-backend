export declare class BreedResponseDto {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    size: string;
    temperament: string;
    lifeExpectancy: string;
    isActive: boolean;
    sortOrder: number;
    isFeatured: boolean;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PaginatedBreedsResponseDto {
    breeds: BreedResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
