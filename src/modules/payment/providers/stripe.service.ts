import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../payment.service';

@Injectable()
export class StripePaymentService {
  private readonly stripe: Stripe;

  constructor(
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripeSecretKey'));
  }

  async createCheckoutSession(
    params?: Stripe.Checkout.SessionCreateParams,
    options?: Stripe.RequestOptions,
  ) {
    try {
      const session = await this.stripe.checkout.sessions.create(
        params,
        options,
      );

      return session;
    } catch (err) {
      console.log(
        'Something went wrong while creating a stripe checkout session',
        err,
      );

      throw new InternalServerErrorException(
        'Something went wrong while creating a stripe checkout session',
      );
    }
  }

  async handleWebhookEvent(
    req: RawBodyRequest<Request>,
  ): Promise<Stripe.Event> {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        this.configService.get('stripeWebhookSecret'),
      );
    } catch (err) {
      console.log('Stripe Webhook Error: ', err);
      throw err;
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const metadata = event.data.object.metadata as any;

        await this.paymentService.handleWebhookEvent(
          {
            paymentId: event.data.object.payment_intent.toString(),
            paymentMethod: event.data.object.payment_method_options[0],
          },
          metadata,
        );
        break;
      }
      default:
        console.log(`Unhandled stripe event type ${event.type}`);
    }

    return event;
  }
}
