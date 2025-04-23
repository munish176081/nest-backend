import { Injectable, RawBodyRequest } from '@nestjs/common';
import { StripePaymentService } from '../payment/providers/stripe.service';
import { Request } from 'express';

@Injectable()
export class WebhookService {
  constructor(private readonly stripePaymentService: StripePaymentService) {}

  handleStripeWebhook(req: RawBodyRequest<Request>) {
    return this.stripePaymentService.handleWebhookEvent(req);
  }
}
