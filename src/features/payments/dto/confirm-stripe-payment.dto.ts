import { IsString } from 'class-validator';

export class ConfirmStripePaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsString()
  paymentMethodId: string;
}

