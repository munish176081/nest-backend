import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class RenewListingDto {
  @Min(1)
  @IsInt()
  durationInDays: number;

  @IsOptional()
  @IsNumber()
  adId?: number;

  @IsOptional()
  @IsNumber()
  adDurationInDays?: number;
}
