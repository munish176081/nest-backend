import { IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsString()
  paymentMethodId: string; // Stripe payment method ID or PayPal payment token
}

