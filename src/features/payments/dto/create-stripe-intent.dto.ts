import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateStripeIntentDto {
  @IsNumber()
  @Min(1)
  amount: number; // Amount in cents

  @IsString()
  listingType: string;

  @IsString()
  @IsOptional()
  listingId?: string;
}

