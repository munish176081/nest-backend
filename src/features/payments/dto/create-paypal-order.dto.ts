import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreatePayPalOrderDto {
  @IsNumber()
  @Min(0.01)
  amount: number; // Amount in USD

  @IsString()
  listingType: string;

  @IsString()
  @IsOptional()
  listingId?: string;
}

