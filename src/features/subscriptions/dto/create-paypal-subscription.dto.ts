import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePayPalSubscriptionDto {
  @IsString()
  listingType: string;

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsBoolean()
  @IsOptional()
  includesFeatured?: boolean; // For Puppy Listings with featured add-on
}

