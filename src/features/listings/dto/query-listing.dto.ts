import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ListingTypeEnum, ListingCategoryEnum, ListingStatusEnum } from '../entities/listing.entity';

export class QueryListingDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: ListingTypeEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(ListingTypeEnum, { each: true })
  types?: ListingTypeEnum[];

  @IsOptional()
  @IsString()
  category?: ListingCategoryEnum;

  @IsOptional()
  @IsString()
  status?: ListingStatusEnum;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  priceType?: 'price_on_request' | 'price_range' | 'price_available';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isPremium?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  excludeId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'viewCount' | 'favoriteCount' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeExpired?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeDrafts?: boolean = false;
}

export class SearchListingDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  type?: ListingTypeEnum;

  @IsOptional()
  @IsString()
  category?: ListingCategoryEnum;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  priceType?: 'price_on_request' | 'price_range' | 'price_available';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
} 