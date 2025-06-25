import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { StripePaymentService } from './providers/stripe.service';
import { ConfigService } from '@nestjs/config';
import { config } from 'src/config/config';
import { ListingsService } from '../marketplace/marketplace.service';
import { Payment, PaymentMethod } from 'src/core/payment';

interface CheckoutProduct {
  price: number;
  currency: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
}

type EventType = 'listing-checkout' | 'listing-renew';

export interface EventMetadata {
  paymentId: string;
  paymentMethod: PaymentMethod;
}

interface ListingMetadata {
  type: EventType;
  listingId: string;
  durationInDays: number;
  price: number;
  adId?: number;
  adDurationInDays?: number;
  adPrice?: number;
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(forwardRef(() => ListingsService))
    private readonly listingsService: ListingsService,
    private readonly stripePaymentService: StripePaymentService,
    private readonly configService: ConfigService,
  ) {}

  createCheckoutSession({
    products,
    metadata,
    provider,
    successUrl,
    cancelUrl,
  }: {
    products: CheckoutProduct[];
    metadata: ListingMetadata;
    provider: 'stripe';
    successUrl?: string;
    cancelUrl?: string;
  }) {
    switch (provider) {
      case 'stripe': {
        return this.stripePaymentService.createCheckoutSession({
          line_items: products.map((product) => ({
            price_data: {
              currency: product.currency ?? config.defaultPaymentCurrency,
              unit_amount: product.price * 100, // price in cents
              product_data: {
                name: product.title,
                description: product.description,
                images: product.imageUrls,
              },
            },
            quantity: 1,
          })),
          mode: 'payment',
          success_url: successUrl ?? this.configService.get('siteUrl'),
          cancel_url: cancelUrl ?? this.configService.get('siteUrl'),
          metadata: metadata as any,
        });
      }

      default: {
        throw new Error(`Provider ${provider} not supported`);
      }
    }
  }

  async handleWebhookEvent(
    eventMetadata: EventMetadata,
    eventData: ListingMetadata,
  ) {
    try {
      switch (eventData.type) {
        case 'listing-checkout': {
          await this.listingsService.startListing({
            listingId: (eventData as ListingMetadata).listingId,
            durationInDays: (eventData as ListingMetadata).durationInDays,
            price: (eventData as ListingMetadata).price,
            adId: (eventData as ListingMetadata).adId,
            adDurationInDays: (eventData as ListingMetadata).adDurationInDays,
            adPrice: (eventData as ListingMetadata).adPrice,
            payment: new Payment(
              eventMetadata.paymentMethod,
              eventMetadata.paymentId,
              'stripe',
            ).urn(),
          });

          break;
        }
        case 'listing-renew': {
          await this.listingsService.renewListing({
            listingId: (eventData as ListingMetadata).listingId,
            durationInDays: (eventData as ListingMetadata).durationInDays,
            price: (eventData as ListingMetadata).price,
            adId: (eventData as ListingMetadata).adId,
            adDurationInDays: (eventData as ListingMetadata).adDurationInDays,
            adPrice: (eventData as ListingMetadata).adPrice,
            payment: new Payment(
              eventMetadata.paymentMethod,
              eventMetadata.paymentId,
              'stripe',
            ).urn(),
          });

          break;
        }
        default:
          throw new Error(`Webhook event type ${eventData.type} not supported`);
      }
    } catch (err) {
      console.log(
        'Failed to handle webhook event',
        err,
        eventMetadata,
        eventData,
      );

      throw err;
    }
  }
}
