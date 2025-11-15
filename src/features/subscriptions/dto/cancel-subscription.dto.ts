import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean; // If true, cancel at end of period; if false, cancel immediately
}

