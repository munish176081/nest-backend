import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  includesFeatured?: boolean;
}

