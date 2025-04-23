import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { StripePaymentService } from './providers/stripe.service';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [forwardRef(() => ListingsModule)],
  providers: [PaymentService, StripePaymentService],
  exports: [PaymentService, StripePaymentService],
})
export class PaymentModule {}
