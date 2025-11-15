import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateStripeSubscriptionSetupDto {
  @IsString()
  listingType: string;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsBoolean()
  includesFeatured?: boolean;
}

