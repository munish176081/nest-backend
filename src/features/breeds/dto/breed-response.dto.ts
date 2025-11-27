import { Expose, Type } from 'class-transformer';

export class BreedResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  category: string;

  @Expose()
  size: string;

  @Expose()
  temperament: string;

  @Expose()
  lifeExpectancy: string;

  @Expose()
  isActive: boolean;

  @Expose()
  sortOrder: number;

  @Expose()
  isFeatured: boolean;

  @Expose()
  imageUrl: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class PaginatedBreedsResponseDto {
  @Expose()
  @Type(() => BreedResponseDto)
  breeds: BreedResponseDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
} 