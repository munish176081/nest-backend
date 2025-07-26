import { Expose, Transform } from 'class-transformer';
import { ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum, ListingAvailabilityEnum } from '../entities/listing.entity';

export class ListingResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  type: ListingTypeEnum;

  @Expose()
  status: ListingStatusEnum;

  @Expose()
  category: ListingCategoryEnum;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  fields: Record<string, any>;

  @Expose()
  metadata: Record<string, any>;

  @Expose()
  price: number;

  @Expose()
  breed: string;

  @Expose()
  location: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  startedOrRenewedAt: Date;

  @Expose()
  publishedAt: Date;

  @Expose()
  viewCount: number;

  @Expose()
  favoriteCount: number;

  @Expose()
  contactCount: number;

  @Expose()
  isFeatured: boolean;

  @Expose()
  isPremium: boolean;

  @Expose()
  isActive: boolean;

  @Expose()
  seoData: Record<string, any>;

  @Expose()
  analytics: Record<string, any>;

  @Expose()
  motherInfo: Record<string, any>;

  @Expose()
  fatherInfo: Record<string, any>;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  availability: ListingAvailabilityEnum;

  @Expose()
  @Transform(({ value }) => value?.name || value?.email || null)
  user?: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
}

export class ListingSummaryDto {
  @Expose()
  id: string;

  @Expose()
  type: ListingTypeEnum;

  @Expose()
  status: ListingStatusEnum;

  @Expose()
  category: ListingCategoryEnum;

  @Expose()
  title: string;

  @Expose()
  price: number;

  @Expose()
  breed: string;

  @Expose()
  location: string;

  @Expose()
  @Transform(({ value }) => value?.images?.[0] || null)
  featuredImage: string;

  @Expose()
  metadata: Record<string, any>;

  @Expose()
  viewCount: number;

  @Expose()
  favoriteCount: number;

  @Expose()
  isFeatured: boolean;

  @Expose()
  isPremium: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  availability: ListingAvailabilityEnum;

  @Expose()
  @Transform(({ value }) => value?.name || null)
  user?: {
    id: string;
    name: string;
  };
}

export class PaginatedListingsResponseDto {
  @Expose()
  data: ListingSummaryDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;

  @Expose()
  hasNext: boolean;

  @Expose()
  hasPrev: boolean;
} 