import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription, SubscriptionStatusEnum } from '../entities/subscription.entity';
import { PaymentLogsService } from '../../payments/payment-logs.service';
import { Listing } from '../../listings/entities/listing.entity';
import { Payment, PaymentMethodEnum, PaymentStatusEnum } from '../../payments/entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// PayPal SDK doesn't have proper ES6 exports, use require
const paypal = require('@paypal/checkout-server-sdk');

@Controller('webhooks')
export class SubscriptionWebhooksController {
  private readonly logger = new Logger(SubscriptionWebhooksController.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    private paymentLogsService: PaymentLogsService,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  @Post('stripe/subscriptions')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      this.paymentLogsService.logError({
        provider: 'stripe',
        error: err instanceof Error ? err : new Error(err.message),
        context: { webhookSignature: signature?.substring(0, 20) + '...' },
      });
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Log webhook received
    this.paymentLogsService.logWebhookReceived({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      requestData: { object: event.data.object },
    });

    try {
      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }

      // Log webhook processed successfully
      this.paymentLogsService.logWebhookProcessed({
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        success: true,
        responseData: { processed: true },
      });

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      
      // Log webhook processing error
      this.paymentLogsService.logWebhookProcessed({
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        success: false,
        error: error instanceof Error ? error : new Error(error.message),
      });

      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      this.mapStripeStatus(subscription.status),
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      { stripeSubscription: subscription },
    );

    // Update listing expiration if linked
    if (subscriptionEntity.listingId) {
      await this.updateListingExpiration(
        subscriptionEntity.listingId,
        new Date(subscription.current_period_end * 1000),
      );
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      this.mapStripeStatus(subscription.status),
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      { stripeSubscription: subscription },
    );

    // Update listing expiration if linked
    if (subscriptionEntity.listingId) {
      await this.updateListingExpiration(
        subscriptionEntity.listingId,
        new Date(subscription.current_period_end * 1000),
      );
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      SubscriptionStatusEnum.CANCELLED,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      false,
      { stripeSubscription: subscription, deletedAt: new Date().toISOString() },
    );
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    // Get subscription from database by Stripe subscription ID
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
      relations: ['user'],
    });
    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe subscription ID: ${subscriptionId}`);
      return;
    }

    // Update subscription status
    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
      undefined,
      undefined,
      undefined,
      { lastPaymentSucceeded: new Date().toISOString() },
    );

    // Create payment record for this invoice payment
    const paymentIntentId = invoice.payment_intent as string;
    const charge = invoice.charge as Stripe.Charge;
    
    try {
      // Check if payment record already exists for this invoice
      const existingPayment = paymentIntentId 
        ? await this.paymentRepository.findOne({
            where: { paymentIntentId },
          })
        : null;

      if (!existingPayment) {
        // Create new payment record for subscription renewal
        const payment = this.paymentRepository.create({
          userId: subscription.userId,
          listingId: subscription.listingId,
          paymentMethod: PaymentMethodEnum.STRIPE,
          status: PaymentStatusEnum.SUCCEEDED,
          amount: invoice.amount_paid / 100, // Convert from cents to dollars
          currency: invoice.currency.toUpperCase(),
          paymentIntentId: paymentIntentId || null,
          paymentMethodId: charge?.payment_method as string || null,
          listingType: subscription.listingType,
          isFeatured: subscription.includesFeatured,
          metadata: {
            stripeInvoice: invoice,
            stripeCharge: charge,
            subscriptionId: subscription.id,
            stripeSubscriptionId: subscriptionId,
            billingReason: invoice.billing_reason,
          },
        });

        await this.paymentRepository.save(payment);
        this.logger.log(`Created payment record for subscription renewal: ${payment.id}`);
      } else {
        // Update existing payment to succeeded if it was pending
        if (existingPayment.status === PaymentStatusEnum.PENDING) {
          existingPayment.status = PaymentStatusEnum.SUCCEEDED;
          existingPayment.metadata = {
            ...existingPayment.metadata,
            stripeInvoice: invoice,
            stripeCharge: charge,
            subscriptionId: subscription.id,
            stripeSubscriptionId: subscriptionId,
            billingReason: invoice.billing_reason,
          };
          await this.paymentRepository.save(existingPayment);
          this.logger.log(`Updated payment record to succeeded: ${existingPayment.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error creating payment record for invoice ${invoice.id}:`, error);
      // Don't throw - continue processing subscription update
    }

    // Handle renewal
    if (invoice.billing_reason === 'subscription_cycle') {
      await this.subscriptionsService.handleSubscriptionRenewal(
        subscriptionId,
        invoice.amount_paid / 100, // Convert from cents
        invoice.currency.toUpperCase(),
      );

      // Update listing expiration
      if (subscription.listingId) {
        const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        await this.updateListingExpiration(
          subscription.listingId,
          new Date(stripeSubscription.current_period_end * 1000),
        );
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.PAST_DUE,
      undefined,
      undefined,
      undefined,
      { lastPaymentFailed: new Date().toISOString(), invoiceId: invoice.id },
    );
  }

  private mapStripeStatus(status: string): SubscriptionStatusEnum {
    const statusMap: Record<string, SubscriptionStatusEnum> = {
      active: SubscriptionStatusEnum.ACTIVE,
      canceled: SubscriptionStatusEnum.CANCELLED,
      incomplete: SubscriptionStatusEnum.INCOMPLETE,
      incomplete_expired: SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatusEnum.PAST_DUE,
      trialing: SubscriptionStatusEnum.TRIALING,
      unpaid: SubscriptionStatusEnum.UNPAID,
    };

    return statusMap[status] || SubscriptionStatusEnum.ACTIVE;
  }

  private async updateListingExpiration(listingId: string, expiresAt: Date) {
    try {
      await this.listingRepository
        .createQueryBuilder()
        .update(Listing)
        .set({ expiresAt })
        .where('id = :listingId', { listingId })
        .execute();
    } catch (error) {
      this.logger.error(`Failed to update listing expiration: ${error}`);
    }
  }

  @Post('paypal/subscriptions')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    if (!webhookId) {
      this.logger.error('PAYPAL_WEBHOOK_ID not configured');
      throw new BadRequestException('Webhook ID not configured');
    }

    const paypalClient = (this.subscriptionsService as any).paypalClient;
    if (!paypalClient) {
      throw new BadRequestException('PayPal not configured');
    }

    try {
      // Verify webhook signature
      const verifyRequest = new paypal.notifications.WebhooksVerifyRequest();
      verifyRequest.requestBody({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: req.body,
      });

      const verificationResponse = await paypalClient.execute(verifyRequest);

      if (verificationResponse.result.verification_status !== 'SUCCESS') {
        throw new BadRequestException('Webhook signature verification failed');
      }
    } catch (err: any) {
      this.logger.error(`PayPal webhook verification failed: ${err.message}`);
      this.paymentLogsService.logError({
        provider: 'paypal',
        error: err instanceof Error ? err : new Error(err.message),
        context: { webhookHeaders: Object.keys(headers) },
      });
      throw new BadRequestException(`Webhook verification failed: ${err.message}`);
    }

    const event = req.body;
    const eventType = event.event_type;

    // Log webhook received
    this.paymentLogsService.logWebhookReceived({
      provider: 'paypal',
      eventType,
      eventId: event.id,
      requestData: event,
    });

    try {
      // Handle different event types
      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await this.handlePayPalSubscriptionCreated(event);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handlePayPalSubscriptionActivated(event);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handlePayPalSubscriptionCancelled(event);
          break;

        case 'BILLING.SUBSCRIPTION.UPDATED':
          await this.handlePayPalSubscriptionUpdated(event);
          break;

        case 'PAYMENT.SALE.COMPLETED':
          await this.handlePayPalPaymentCompleted(event);
          break;

        case 'PAYMENT.SALE.DENIED':
        case 'PAYMENT.SALE.REFUNDED':
          await this.handlePayPalPaymentFailed(event);
          break;

        default:
          this.logger.debug(`Unhandled PayPal event type: ${eventType}`);
      }

      // Log webhook processed successfully
      this.paymentLogsService.logWebhookProcessed({
        provider: 'paypal',
        eventType,
        eventId: event.id,
        success: true,
        responseData: { processed: true },
      });

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing PayPal webhook: ${error.message}`, error.stack);

      // Log webhook processing error
      this.paymentLogsService.logWebhookProcessed({
        provider: 'paypal',
        eventType,
        eventId: event.id,
        success: false,
        error: error instanceof Error ? error : new Error(error.message),
      });

      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  private async handlePayPalSubscriptionCreated(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) return;

    const startTime = event.resource?.start_time
      ? new Date(event.resource.start_time)
      : new Date();
    const endTime = event.resource?.billing_info?.next_billing_time
      ? new Date(event.resource.billing_info.next_billing_time)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.INCOMPLETE,
      startTime,
      endTime,
      false,
      { paypalSubscription: event.resource },
    );
  }

  private async handlePayPalSubscriptionActivated(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
      event.resource?.start_time ? new Date(event.resource.start_time) : undefined,
      event.resource?.billing_info?.next_billing_time
        ? new Date(event.resource.billing_info.next_billing_time)
        : undefined,
      false,
      { paypalSubscription: event.resource },
    );

    // Update listing expiration if linked
    if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
      await this.updateListingExpiration(
        subscription.listingId,
        new Date(event.resource.billing_info.next_billing_time),
      );
    }
  }

  private async handlePayPalSubscriptionCancelled(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) return;

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.CANCELLED,
      undefined,
      undefined,
      false,
      { paypalSubscription: event.resource, cancelledAt: new Date().toISOString() },
    );
  }

  private async handlePayPalSubscriptionUpdated(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) return;

    const status = this.mapPayPalStatus(event.resource?.status);
    const subscription = await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      status,
      event.resource?.start_time ? new Date(event.resource.start_time) : undefined,
      event.resource?.billing_info?.next_billing_time
        ? new Date(event.resource.billing_info.next_billing_time)
        : undefined,
      false,
      { paypalSubscription: event.resource },
    );

    // Update listing expiration if linked
    if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
      await this.updateListingExpiration(
        subscription.listingId,
        new Date(event.resource.billing_info.next_billing_time),
      );
    }
  }

  private async handlePayPalPaymentCompleted(event: any) {
    const subscriptionId = event.resource?.billing_agreement_id;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
      undefined,
      undefined,
      undefined,
      { lastPaymentSucceeded: new Date().toISOString(), saleId: event.resource?.id },
    );

    // Handle renewal
    const amount = parseFloat(event.resource?.amount?.total || '0');
    const currency = event.resource?.amount?.currency || 'AUD';

    await this.subscriptionsService.handleSubscriptionRenewal(
      subscriptionId,
      amount,
      currency,
    );

    // Update listing expiration
    if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
      await this.updateListingExpiration(
        subscription.listingId,
        new Date(event.resource.billing_info.next_billing_time),
      );
    }
  }

  private async handlePayPalPaymentFailed(event: any) {
    const subscriptionId = event.resource?.billing_agreement_id;
    if (!subscriptionId) return;

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.PAST_DUE,
      undefined,
      undefined,
      undefined,
      { lastPaymentFailed: new Date().toISOString(), saleId: event.resource?.id },
    );
  }

  private mapPayPalStatus(status: string): SubscriptionStatusEnum {
    const statusMap: Record<string, SubscriptionStatusEnum> = {
      ACTIVE: SubscriptionStatusEnum.ACTIVE,
      CANCELLED: SubscriptionStatusEnum.CANCELLED,
      EXPIRED: SubscriptionStatusEnum.EXPIRED,
      SUSPENDED: SubscriptionStatusEnum.PAST_DUE,
    };

    return statusMap[status] || SubscriptionStatusEnum.ACTIVE;
  }
}

