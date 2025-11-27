import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsBoolean, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingTypeEnum, ListingCategoryEnum, ListingAvailabilityEnum, ListingStatusEnum } from '../entities/listing.entity';

export class ContactInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class SeoDataDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class ParentInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  temperament?: string;

  @IsOptional()
  @IsString()
  healthInfo?: string;
}

export class CreateListingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ListingTypeEnum)
  type: ListingTypeEnum;

  @IsEnum(ListingCategoryEnum)
  category: ListingCategoryEnum;

  @IsOptional()
  @IsEnum(ListingAvailabilityEnum)
  availability?: ListingAvailabilityEnum;

  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  breedId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDataDto)
  seoData?: SeoDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInfoDto)
  motherInfo?: ParentInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInfoDto)
  fatherInfo?: ParentInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInfoDto)
  studInfo?: ParentInfoDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsOptional()
  @IsEnum(ListingStatusEnum)
  status?: ListingStatusEnum;
} 