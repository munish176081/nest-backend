import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateStripeSubscriptionDto {
  @IsString()
  listingType: string;

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe payment method ID (optional - if not provided, Payment Element will collect it)

  @IsBoolean()
  @IsOptional()
  includesFeatured?: boolean; // For Puppy Listings with featured add-on
}

