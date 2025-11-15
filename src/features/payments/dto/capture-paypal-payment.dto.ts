import { IsString } from 'class-validator';

export class CapturePayPalPaymentDto {
  @IsString()
  orderId: string;
}

