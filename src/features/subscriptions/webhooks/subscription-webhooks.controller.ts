import {
  Controller,
  Post,
  Get,
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
import { Listing, ListingStatusEnum } from '../../listings/entities/listing.entity';
import { Payment, PaymentMethodEnum, PaymentStatusEnum } from '../../payments/entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// PayPal webhook verification is done manually via API calls

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
    const timestamp = new Date().toISOString();

    this.logger.log(`🔔 [WEBHOOK] Stripe webhook received at ${timestamp}`);
    this.logger.log(`🔔 [WEBHOOK] Signature present: ${!!signature}`);

    if (!webhookSecret) {
      this.logger.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!this.stripe) {
      this.logger.error('❌ [WEBHOOK] Stripe not configured');
      throw new BadRequestException('Stripe not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      this.logger.log(`🔍 [WEBHOOK] Verifying webhook signature...`);
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
      this.logger.log(`✅ [WEBHOOK] Signature verified successfully`);
    } catch (err: any) {
      this.logger.error(`❌ [WEBHOOK] Signature verification failed: ${err.message}`);
      this.logger.error(`❌ [WEBHOOK] Error details: ${JSON.stringify(err, null, 2)}`);
      this.paymentLogsService.logError({
        provider: 'stripe',
        error: err instanceof Error ? err : new Error(err.message),
        context: { webhookSignature: signature?.substring(0, 20) + '...' },
      });
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Enhanced webhook logging
    this.logger.log(`📥 [WEBHOOK] Event received:`);
    this.logger.log(`   - Type: ${event.type}`);
    this.logger.log(`   - ID: ${event.id}`);
    this.logger.log(`   - Created: ${new Date(event.created * 1000).toISOString()}`);
    this.logger.log(`   - Livemode: ${event.livemode}`);
    
    if (event.data?.object) {
      const obj = event.data.object as any;
      if (obj.id) {
        this.logger.log(`   - Object ID: ${obj.id}`);
      }
      if (obj.subscription) {
        this.logger.log(`   - Subscription ID: ${obj.subscription}`);
      }
      if (obj.status) {
        this.logger.log(`   - Status: ${obj.status}`);
      }
    }

    // Log webhook received
    this.paymentLogsService.logWebhookReceived({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      requestData: { object: event.data.object },
    });

    try {
      this.logger.log(`🔄 [WEBHOOK] Processing event type: ${event.type}`);
      
      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
          this.logger.log(`📝 [WEBHOOK] Handling subscription.created`);
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          this.logger.log(`📝 [WEBHOOK] Handling subscription.updated`);
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          this.logger.log(`📝 [WEBHOOK] Handling subscription.deleted`);
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          this.logger.log(`📝 [WEBHOOK] Handling invoice.payment_succeeded`);
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          this.logger.log(`📝 [WEBHOOK] Handling invoice.payment_failed`);
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.warn(`⚠️ [WEBHOOK] Unhandled event type: ${event.type}`);
      }

      this.logger.log(`✅ [WEBHOOK] Event processed successfully: ${event.type}`);

      // Log webhook processed successfully
      this.paymentLogsService.logWebhookProcessed({
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        success: true,
        responseData: { processed: true },
      });

      return { received: true, eventType: event.type, eventId: event.id };
    } catch (error: any) {
      this.logger.error(`❌ [WEBHOOK] Error processing webhook: ${error.message}`);
      this.logger.error(`❌ [WEBHOOK] Stack trace: ${error.stack}`);
      this.logger.error(`❌ [WEBHOOK] Event type: ${event.type}, Event ID: ${event.id}`);
      
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
    this.logger.log(`📝 [SUBSCRIPTION_CREATED] Processing subscription: ${subscription.id}`);
    this.logger.log(`   - Status: ${subscription.status}`);
    this.logger.log(`   - Customer: ${subscription.customer}`);
    this.logger.log(`   - Metadata: ${JSON.stringify(subscription.metadata, null, 2)}`);
    
    const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      this.mapStripeStatus(subscription.status),
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      { stripeSubscription: subscription },
    );

    this.logger.log(`✅ [SUBSCRIPTION_CREATED] Subscription updated in database: ${subscriptionEntity.id}`);
    this.logger.log(`   - Database ID: ${subscriptionEntity.id}`);
    this.logger.log(`   - Listing ID: ${subscriptionEntity.listingId || 'null'}`);

    // Update listing expiration if linked
    if (subscriptionEntity.listingId) {
      this.logger.log(`📅 [SUBSCRIPTION_CREATED] Updating listing expiration: ${subscriptionEntity.listingId}`);
      await this.updateListingExpiration(
        subscriptionEntity.listingId,
        new Date(subscription.current_period_end * 1000),
      );
      this.logger.log(`✅ [SUBSCRIPTION_CREATED] Listing expiration updated`);
    } else {
      this.logger.log(`ℹ️ [SUBSCRIPTION_CREATED] Subscription not linked to listing yet`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`📝 [SUBSCRIPTION_UPDATED] Processing subscription: ${subscription.id}`);
    this.logger.log(`   - Status: ${subscription.status}`);
    this.logger.log(`   - Cancel at period end: ${subscription.cancel_at_period_end}`);
    this.logger.log(`   - Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
    
    const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      this.mapStripeStatus(subscription.status),
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      { stripeSubscription: subscription },
    );

    this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Subscription updated in database: ${subscriptionEntity.id}`);
    this.logger.log(`   - Database ID: ${subscriptionEntity.id}`);
    this.logger.log(`   - Listing ID: ${subscriptionEntity.listingId || 'null'}`);
    this.logger.log(`   - Mapped Status: ${this.mapStripeStatus(subscription.status)}`);

    // Update listing based on subscription status
    if (subscriptionEntity.listingId) {
      const mappedStatus = this.mapStripeStatus(subscription.status);
      const inactiveStatuses = [
        SubscriptionStatusEnum.CANCELLED,
        SubscriptionStatusEnum.PAST_DUE,
        SubscriptionStatusEnum.UNPAID,
        SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
      ];

      // If subscription becomes inactive or is canceled, deactivate listing
      // This handles both immediate cancellation and cancellation at period end (when period actually ends)
      if (inactiveStatuses.includes(mappedStatus) || subscription.status === 'canceled') {
        this.logger.log(`🔄 [SUBSCRIPTION_UPDATED] Deactivating listing due to inactive subscription status`);
        try {
          await this.listingRepository
            .createQueryBuilder()
            .update(Listing)
            .set({ 
              isActive: false,
              status: ListingStatusEnum.EXPIRED,
            })
            .where('id = :listingId', { listingId: subscriptionEntity.listingId })
            .execute();
          this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Deactivated listing ${subscriptionEntity.listingId} due to subscription cancellation. Status: ${mappedStatus}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);
        } catch (error) {
          this.logger.error(`❌ [SUBSCRIPTION_UPDATED] Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
        }
      } else if (mappedStatus === SubscriptionStatusEnum.ACTIVE) {
        // If subscription is active (even if cancel_at_period_end is true), update expiration date
        // The listing will remain active until the period actually ends
        this.logger.log(`📅 [SUBSCRIPTION_UPDATED] Updating listing expiration date`);
        await this.updateListingExpiration(
          subscriptionEntity.listingId,
          new Date(subscription.current_period_end * 1000),
        );
        this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Listing expiration updated`);
      }
    } else {
      this.logger.log(`ℹ️ [SUBSCRIPTION_UPDATED] Subscription not linked to listing`);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Get subscription from database before updating
    const subscriptionEntity = await this.subscriptionRepository.findOne({
      where: { subscriptionId: subscription.id },
    });

    await this.subscriptionsService.updateSubscriptionStatus(
      subscription.id,
      SubscriptionStatusEnum.CANCELLED,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      false,
      { stripeSubscription: subscription, deletedAt: new Date().toISOString() },
    );

    // Deactivate linked listing when subscription is cancelled
    if (subscriptionEntity?.listingId) {
      try {
        await this.listingRepository
          .createQueryBuilder()
          .update(Listing)
          .set({ 
            isActive: false,
            status: ListingStatusEnum.EXPIRED,
          })
          .where('id = :listingId', { listingId: subscriptionEntity.listingId })
          .execute();
        this.logger.log(`Deactivated listing ${subscriptionEntity.listingId} due to subscription cancellation`);
      } catch (error) {
        this.logger.error(`Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
      }
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`💳 [PAYMENT_SUCCEEDED] Processing invoice: ${invoice.id}`);
    
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) {
      this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] No subscription ID in invoice: ${invoice.id}`);
      return;
    }

    this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Looking for subscription with Stripe ID: ${subscriptionId}`);

    // Get subscription from database by Stripe subscription ID
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
      relations: ['user'],
    });
    
    if (!subscription) {
      this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] Subscription not found for Stripe subscription ID: ${subscriptionId}`);
      this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] Invoice details: ${JSON.stringify({
        invoiceId: invoice.id,
        subscriptionId,
        customer: invoice.customer,
        amount: invoice.amount_paid,
        status: invoice.status,
      }, null, 2)}`);
      return;
    }

    this.logger.log(`✅ [PAYMENT_SUCCEEDED] Found subscription in database:`);
    this.logger.log(`   - Database ID: ${subscription.id}`);
    this.logger.log(`   - Stripe ID: ${subscription.subscriptionId}`);
    this.logger.log(`   - Current Status: ${subscription.status}`);
    this.logger.log(`   - Listing ID: ${subscription.listingId || 'null'}`);
    this.logger.log(`   - User ID: ${subscription.userId}`);

    // Update subscription status
    this.logger.log(`🔄 [PAYMENT_SUCCEEDED] Updating subscription status to ACTIVE`);
    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
      undefined,
      undefined,
      undefined,
      { lastPaymentSucceeded: new Date().toISOString() },
    );
    this.logger.log(`✅ [PAYMENT_SUCCEEDED] Subscription status updated to ACTIVE`);

    // If subscription is not linked to a listing, try to find and link it
    if (!subscription.listingId) {
      this.logger.log(`🔗 [PAYMENT_SUCCEEDED] Subscription not linked to listing, attempting to link...`);
      try {
        // Get the Stripe subscription to check metadata
        this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Retrieving Stripe subscription to check metadata`);
        const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        const listingIdFromMetadata = stripeSubscription.metadata?.listingId;
        
        this.logger.log(`📋 [PAYMENT_SUCCEEDED] Stripe subscription metadata: ${JSON.stringify(stripeSubscription.metadata, null, 2)}`);
        this.logger.log(`📋 [PAYMENT_SUCCEEDED] Listing ID from metadata: ${listingIdFromMetadata || 'null'}`);
        
        if (listingIdFromMetadata) {
          // Verify the listing exists and belongs to the same user
          this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Looking for listing: ${listingIdFromMetadata}`);
          const listing = await this.listingRepository.findOne({
            where: { id: listingIdFromMetadata, userId: subscription.userId },
          });
          
          if (listing) {
            this.logger.log(`✅ [PAYMENT_SUCCEEDED] Found listing, linking subscription to listing`);
            subscription.listingId = listingIdFromMetadata;
            await this.subscriptionRepository.save(subscription);
            this.logger.log(`✅ [PAYMENT_SUCCEEDED] Linked subscription ${subscriptionId} to listing ${listingIdFromMetadata}`);
            
            // Update listing expiration but keep it in PENDING_REVIEW status for admin approval
            const expirationDate = new Date(stripeSubscription.current_period_end * 1000);
            this.logger.log(`📅 [PAYMENT_SUCCEEDED] Updating listing expiration to: ${expirationDate.toISOString()}`);
            await this.updateListingExpiration(
              listingIdFromMetadata,
              expirationDate,
            );
            
            // Don't auto-activate listing - keep it in PENDING_REVIEW status for admin approval
            // Admin must explicitly approve the listing to change status to ACTIVE
            this.logger.log(`⏳ [PAYMENT_SUCCEEDED] Listing ${listingIdFromMetadata} remains in ${listing.status} status, awaiting admin approval`);
          } else {
            this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] Listing not found or doesn't belong to user: ${listingIdFromMetadata}`);
          }
        } else {
          this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] No listingId in Stripe subscription metadata`);
        }
      } catch (error) {
        this.logger.error(`❌ [PAYMENT_SUCCEEDED] Error linking subscription to listing:`, error);
        this.logger.error(`❌ [PAYMENT_SUCCEEDED] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        // Don't throw - continue processing payment
      }
    } else {
      this.logger.log(`ℹ️ [PAYMENT_SUCCEEDED] Subscription already linked to listing: ${subscription.listingId}`);
    }

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
    this.logger.log(`💳 [PAYMENT_FAILED] Processing invoice: ${invoice.id}`);
    
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) {
      this.logger.warn(`⚠️ [PAYMENT_FAILED] No subscription ID in invoice: ${invoice.id}`);
      return;
    }

    this.logger.log(`🔍 [PAYMENT_FAILED] Looking for subscription with Stripe ID: ${subscriptionId}`);

    // Get subscription from database
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`⚠️ [PAYMENT_FAILED] Subscription not found for Stripe subscription ID: ${subscriptionId}`);
      return;
    }

    this.logger.log(`✅ [PAYMENT_FAILED] Found subscription in database:`);
    this.logger.log(`   - Database ID: ${subscription.id}`);
    this.logger.log(`   - Listing ID: ${subscription.listingId || 'null'}`);

    this.logger.log(`🔄 [PAYMENT_FAILED] Updating subscription status to PAST_DUE`);
    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.PAST_DUE,
      undefined,
      undefined,
      undefined,
      { lastPaymentFailed: new Date().toISOString(), invoiceId: invoice.id },
    );
    this.logger.log(`✅ [PAYMENT_FAILED] Subscription status updated to PAST_DUE`);

    // Deactivate linked listing if payment fails
    if (subscription?.listingId) {
      this.logger.log(`🔄 [PAYMENT_FAILED] Deactivating listing: ${subscription.listingId}`);
      try {
        await this.listingRepository
          .createQueryBuilder()
          .update(Listing)
          .set({ 
            isActive: false,
            status: ListingStatusEnum.EXPIRED,
          })
          .where('id = :listingId', { listingId: subscription.listingId })
          .execute();
        this.logger.log(`✅ [PAYMENT_FAILED] Deactivated listing ${subscription.listingId} due to payment failure`);
      } catch (error) {
        this.logger.error(`❌ [PAYMENT_FAILED] Failed to deactivate listing ${subscription.listingId}:`, error);
      }
    } else {
      this.logger.log(`ℹ️ [PAYMENT_FAILED] Subscription not linked to listing, skipping deactivation`);
    }
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

  /**
   * Verify PayPal webhook signature manually using PayPal API
   */
  private async verifyPayPalWebhook(
    headers: Record<string, string>,
    body: any,
    webhookId: string,
  ): Promise<void> {
    const https = require('https');
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';
    const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('PayPal credentials not configured');
    }

    // Get access token
    const accessToken = await this.getPayPalAccessToken();

    // Check for required headers
    const requiredHeaders = [
      'paypal-auth-algo',
      'paypal-cert-url',
      'paypal-transmission-id',
      'paypal-transmission-sig',
      'paypal-transmission-time',
    ];

    const missingHeaders = requiredHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      this.logger.error(`❌ Missing required PayPal webhook headers: ${missingHeaders.join(', ')}`);
      throw new BadRequestException(`Missing required webhook headers: ${missingHeaders.join(', ')}`);
    }

    // Prepare verification request body
    const verificationBody = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body,
    };

    this.logger.debug('🔍 Verifying PayPal webhook with:', {
      webhook_id: webhookId,
      transmission_id: headers['paypal-transmission-id'],
      has_body: !!body,
    });

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(verificationBody);
      const options = {
        hostname,
        path: '/v1/notifications/verify-webhook-signature',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res: any) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            // Log response for debugging
            this.logger.debug(`📥 PayPal verification response status: ${res.statusCode}`);
            this.logger.debug(`📥 PayPal verification response body: ${data.substring(0, 500)}`);

            if (res.statusCode !== 200) {
              const errorMsg = `PayPal API returned status ${res.statusCode}: ${data}`;
              this.logger.error(`❌ ${errorMsg}`);
              reject(new BadRequestException(errorMsg));
              return;
            }

            const response = JSON.parse(data);
            if (response.verification_status === 'SUCCESS') {
              this.logger.debug('✅ PayPal webhook signature verified successfully');
              resolve();
            } else {
              const status = response.verification_status || 'UNKNOWN';
              const errorDetails = response.error_details || response.message || 'No details';
              this.logger.error(`❌ PayPal webhook verification failed: ${status}`, {
                verification_status: status,
                error_details: errorDetails,
                full_response: response,
              });
              reject(new BadRequestException(`Webhook verification failed: ${status} - ${errorDetails}`));
            }
          } catch (error: any) {
            const errorMsg = error?.message || error?.toString() || 'Unknown parsing error';
            this.logger.error(`❌ Error parsing PayPal verification response: ${errorMsg}`, {
              raw_response: data,
              error: error,
            });
            reject(new BadRequestException(`Webhook verification failed: ${errorMsg}`));
          }
        });
      });

      req.on('error', (error: Error) => {
        const errorMsg = error?.message || error?.toString() || 'Unknown network error';
        this.logger.error(`❌ Error verifying PayPal webhook: ${errorMsg}`, {
          error: error,
          stack: error?.stack,
        });
        reject(new BadRequestException(`Webhook verification failed: ${errorMsg}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Get PayPal access token for API calls
   */
  private async getPayPalAccessToken(): Promise<string> {
    const https = require('https');
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';
    const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('PayPal credentials not configured');
    }

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const options = {
        hostname,
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      const req = https.request(options, (res: any) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              const errorMsg = `PayPal token API returned status ${res.statusCode}: ${data}`;
              this.logger.error(`❌ ${errorMsg}`);
              reject(new Error(errorMsg));
              return;
            }

            const response = JSON.parse(data);
            if (response.access_token) {
              this.logger.debug('✅ PayPal access token obtained successfully');
              resolve(response.access_token);
            } else {
              const errorMsg = response.error_description || response.error || 'Unknown error';
              this.logger.error(`❌ Failed to get PayPal access token: ${errorMsg}`, {
                response: response,
              });
              reject(new Error(`Failed to get PayPal access token: ${errorMsg}`));
            }
          } catch (error: any) {
            const errorMsg = error?.message || error?.toString() || 'Unknown parsing error';
            this.logger.error(`❌ Error parsing PayPal token response: ${errorMsg}`, {
              raw_response: data,
              error: error,
            });
            reject(new Error(`Error parsing PayPal token response: ${errorMsg}`));
          }
        });
      });

      req.on('error', (error: Error) => {
        const errorMsg = error?.message || error?.toString() || 'Unknown network error';
        this.logger.error(`❌ Network error getting PayPal token: ${errorMsg}`, {
          error: error,
          stack: error?.stack,
        });
        reject(error);
      });

      req.write('grant_type=client_credentials');
      req.end();
    });
  }

  private async updateListingExpiration(listingId: string, expiresAt: Date) {
    try {
      this.logger.log(`📅 [UPDATE_EXPIRATION] Updating listing ${listingId} expiration to ${expiresAt.toISOString()}`);
      
      // Check current listing status to handle EXPIRED listings
      const listing = await this.listingRepository.findOne({
        where: { id: listingId },
      });

      const updateData: Partial<Listing> = { expiresAt };

      // If listing is EXPIRED, reactivate it to PENDING_REVIEW for admin approval
      if (listing && listing.status === ListingStatusEnum.EXPIRED) {
        updateData.status = ListingStatusEnum.PENDING_REVIEW;
        updateData.isActive = false;
        this.logger.log(`🔄 [UPDATE_EXPIRATION] Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
      }

      await this.listingRepository
        .createQueryBuilder()
        .update(Listing)
        .set(updateData)
        .where('id = :listingId', { listingId })
        .execute();
      this.logger.log(`✅ [UPDATE_EXPIRATION] Listing expiration updated successfully`);
    } catch (error) {
      this.logger.error(`❌ [UPDATE_EXPIRATION] Failed to update listing expiration: ${error}`);
      this.logger.error(`❌ [UPDATE_EXPIRATION] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    }
  }

  @Get('stripe/test')
  @HttpCode(HttpStatus.OK)
  async testWebhookEndpoint() {
    this.logger.log(`🧪 [TEST] Webhook test endpoint called`);
    const siteUrl = this.configService.get<string>('siteUrl') || 'http://localhost:3000';
    const webhookUrl = `${siteUrl}/api/v1/webhooks/stripe/subscriptions`;
    
    return {
      status: 'ok',
      message: 'Webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      webhookSecretConfigured: !!this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      stripeConfigured: !!this.stripe,
      webhookUrl: webhookUrl,
      instructions: {
        step1: 'Go to Stripe Dashboard → Developers → Webhooks',
        step2: `Add endpoint URL: ${webhookUrl}`,
        step3: 'Select events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed',
        step4: 'Copy the webhook signing secret and set it as STRIPE_WEBHOOK_SECRET in your environment variables',
      },
    };
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

    // Log received headers for debugging
    this.logger.debug('📥 PayPal webhook headers received:', {
      headerKeys: Object.keys(headers),
      paypalHeaders: {
        'paypal-auth-algo': headers['paypal-auth-algo'] || headers['Paypal-Auth-Algo'],
        'paypal-cert-url': headers['paypal-cert-url'] || headers['Paypal-Cert-Url'],
        'paypal-transmission-id': headers['paypal-transmission-id'] || headers['Paypal-Transmission-Id'],
        'paypal-transmission-sig': headers['paypal-transmission-sig'] || headers['Paypal-Transmission-Sig'],
        'paypal-transmission-time': headers['paypal-transmission-time'] || headers['Paypal-Transmission-Time'],
      },
    });

    // Skip verification in development mode if SKIP_PAYPAL_WEBHOOK_VERIFICATION is set
    const skipVerification = this.configService.get<string>('SKIP_PAYPAL_WEBHOOK_VERIFICATION') === 'true';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    
    if (skipVerification || nodeEnv === 'development') {
      this.logger.warn('⚠️ [DEV MODE] Skipping PayPal webhook verification');
    } else {
      try {
        // Normalize headers (PayPal may send with different casing)
        const normalizedHeaders: Record<string, string> = {};
        Object.keys(headers).forEach(key => {
          const lowerKey = key.toLowerCase();
          normalizedHeaders[lowerKey] = headers[key];
        });

        // Verify webhook signature using PayPal API
        await this.verifyPayPalWebhook(normalizedHeaders, req.body, webhookId);
      } catch (err: any) {
        const errorMsg = err?.message || err?.toString() || 'Unknown verification error';
        this.logger.error(`PayPal webhook verification failed: ${errorMsg}`, {
          error: err,
          stack: err?.stack,
          headers: Object.keys(headers),
        });
        this.paymentLogsService.logError({
          provider: 'paypal',
          error: err instanceof Error ? err : new Error(errorMsg),
          context: { webhookHeaders: Object.keys(headers), errorMessage: errorMsg },
        });
        throw new BadRequestException(`Webhook verification failed: ${errorMsg}`);
      }
    }

    const event = req.body;
    const eventType = event.event_type;

    // Log webhook received with full details
    this.logger.log(`🔔 [PayPal Webhook] Received event: ${eventType}`, {
      eventId: event.id,
      subscriptionId: event.resource?.id,
      eventType,
      resourceStatus: event.resource?.status,
      resourceId: event.resource?.id,
      fullEvent: JSON.stringify(event, null, 2),
    });

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
    if (!subscriptionId) {
      this.logger.warn('⚠️ [PayPal Subscription Activated] No subscription ID in event');
      this.logger.warn('⚠️ [PayPal Subscription Activated] Event data:', JSON.stringify(event, null, 2));
      return;
    }

    this.logger.log(`🔔 [PayPal Subscription Activated] ========== START ==========`);
    this.logger.log(`🔔 [PayPal Subscription Activated] Processing subscription: ${subscriptionId}`);
    this.logger.log(`🔔 [PayPal Subscription Activated] Full event data:`, JSON.stringify(event, null, 2));

    // Get subscription from database before updating to check if payment record exists
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
    });

    if (!existingSubscription) {
      this.logger.warn(`⚠️ [PayPal Subscription Activated] Subscription not found in database: ${subscriptionId}`);
      return;
    }

    this.logger.log(`✅ [PayPal Subscription Activated] Found subscription in database:`, {
      id: existingSubscription.id,
      userId: existingSubscription.userId,
      listingId: existingSubscription.listingId,
      listingType: existingSubscription.listingType,
      amount: existingSubscription.amount,
    });

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

    // Create payment record for initial subscription payment if it doesn't exist
    if (existingSubscription) {
      // Check if payment record already exists for this subscription
      // Query by checking metadata JSONB field for subscription ID
      const existingPayment = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.paymentMethod = :paymentMethod', { paymentMethod: PaymentMethodEnum.PAYPAL })
        .andWhere('payment.userId = :userId', { userId: subscription.userId })
        .andWhere(
          `(payment.metadata->>'paypalSubscriptionId' = :subscriptionId OR payment.metadata->>'subscriptionId' = :dbSubscriptionId)`,
          { subscriptionId, dbSubscriptionId: subscription.id }
        )
        .getOne();

      if (!existingPayment) {
        // Get payment amount from subscription or event
        const amount = subscription.amount || parseFloat(event.resource?.billing_info?.last_payment?.amount?.value || '0');
        const currency = subscription.currency || event.resource?.billing_info?.last_payment?.amount?.currency_code || 'AUD';

        if (amount > 0) {
          const payment = this.paymentRepository.create({
            userId: subscription.userId,
            listingId: subscription.listingId,
            paymentMethod: PaymentMethodEnum.PAYPAL,
            status: PaymentStatusEnum.SUCCEEDED,
            amount: amount,
            currency: currency,
            listingType: subscription.listingType,
            isFeatured: subscription.includesFeatured,
            metadata: {
              paypalSubscription: event.resource,
              subscriptionId: subscription.id,
              paypalSubscriptionId: subscriptionId,
              billingReason: 'subscription_create',
              initialPayment: true,
            },
          });

          await this.paymentRepository.save(payment);
          this.logger.log(`✅ [PayPal Subscription Activated] Created payment record for initial payment:`, {
            paymentId: payment.id,
            userId: payment.userId,
            listingId: payment.listingId,
            amount: payment.amount,
            currency: payment.currency,
          });
        } else {
          this.logger.warn(`⚠️ [PayPal Subscription Activated] Amount is 0, skipping payment record creation`);
        }
      }
    }

    // Activate listing if it exists and is in DRAFT status
    if (subscription.listingId) {
      try {
        this.logger.log(`📋 [PayPal Subscription Activated] Fetching listing: ${subscription.listingId}`);
        const listing = await this.listingRepository.findOne({
          where: { id: subscription.listingId },
        });

        if (listing) {
          this.logger.log(`📋 [PayPal Subscription Activated] Listing found - BEFORE UPDATE:`, {
            listingId: listing.id,
            currentStatus: listing.status,
            isActive: listing.isActive,
            expiresAt: listing.expiresAt,
          });

          // Update listing expiration and status
          const updateData: Partial<Listing> = {};

          // Update expiration if provided
          if (event.resource?.billing_info?.next_billing_time) {
            updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
            this.logger.log(`📅 [PayPal Subscription Activated] Will update expiration to: ${updateData.expiresAt}`);
          }

          // Check if listing was recently created (within last 10 minutes) - indicates it's a new listing that needs admin approval
          const listingAge = Date.now() - new Date(listing.createdAt).getTime();
          const isRecentlyCreated = listingAge < 10 * 60 * 1000; // 10 minutes
          const hasNoPublishedAt = !listing.publishedAt; // Not yet approved by admin
          
          this.logger.log(`📊 [PayPal Subscription Activated] Listing metadata:`, {
            listingAge: `${Math.round(listingAge / 1000)}s`,
            isRecentlyCreated,
            hasNoPublishedAt,
            publishedAt: listing.publishedAt,
          });

          // If listing is in DRAFT status, change it to PENDING_REVIEW for admin approval
          if (listing.status === ListingStatusEnum.DRAFT) {
            updateData.status = ListingStatusEnum.PENDING_REVIEW;
            updateData.isActive = false;
            this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
            this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
          } else if (listing.status === ListingStatusEnum.EXPIRED) {
            // If listing is EXPIRED, reactivate it to PENDING_REVIEW for admin approval
            updateData.status = ListingStatusEnum.PENDING_REVIEW;
            updateData.isActive = false;
            this.logger.log(`🔄 [PayPal Subscription Activated] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
            this.logger.log(`🔄 [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
          } else if (listing.status === ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
            // CRITICAL FIX: If listing is ACTIVE but was recently created and not yet published (approved),
            // it means something incorrectly set it to ACTIVE. Change it to PENDING_REVIEW for admin approval.
            updateData.status = ListingStatusEnum.PENDING_REVIEW;
            updateData.isActive = false;
            this.logger.log(`🔧 [PayPal Subscription Activated] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
            this.logger.log(`🔧 [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
          } else if (listing.status === ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
            // Listing is already in PENDING_REVIEW, just update expiration
            this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
            this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
          } else if (event.resource?.billing_info?.next_billing_time) {
            // For other statuses, just update expiration
            this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
            this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
          } else {
            this.logger.log(`ℹ️ [PayPal Subscription Activated] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
          }

          if (Object.keys(updateData).length > 0) {
            this.logger.log(`💾 [PayPal Subscription Activated] Executing database update...`);
            await this.listingRepository
              .createQueryBuilder()
              .update(Listing)
              .set(updateData)
              .where('id = :listingId', { listingId: subscription.listingId })
              .execute();
            
            // Verify the update
            const updatedListing = await this.listingRepository.findOne({
              where: { id: subscription.listingId },
            });
            
            this.logger.log(`✅ [PayPal Subscription Activated] Listing updated - AFTER UPDATE:`, {
              listingId: updatedListing?.id,
              newStatus: updatedListing?.status,
              newIsActive: updatedListing?.isActive,
              newExpiresAt: updatedListing?.expiresAt,
            });
            
            if (updateData.status) {
              this.logger.log(`✅ [PayPal Subscription Activated] Listing status updated to ${updateData.status}: ${subscription.listingId}`);
            }
          } else {
            this.logger.log(`ℹ️ [PayPal Subscription Activated] No database update performed (updateData is empty)`);
          }
        } else {
          this.logger.warn(`⚠️ [PayPal Subscription Activated] Listing not found: ${subscription.listingId}`);
        }
      } catch (error) {
        this.logger.error(`❌ [PayPal Subscription Activated] Error activating listing ${subscription.listingId}:`, error);
        this.logger.error(`❌ [PayPal Subscription Activated] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      }
    } else {
      this.logger.warn(`⚠️ [PayPal Subscription Activated] Subscription ${subscriptionId} is active but not linked to a listing.`);
    }
    
    this.logger.log(`🔔 [PayPal Subscription Activated] ========== END ==========`);
  }

  private async handlePayPalSubscriptionCancelled(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) return;

    // Get subscription from database before updating
    const subscriptionEntity = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
    });

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.CANCELLED,
      undefined,
      undefined,
      false,
      { paypalSubscription: event.resource, cancelledAt: new Date().toISOString() },
    );

    // Deactivate linked listing when subscription is cancelled
    if (subscriptionEntity?.listingId) {
      try {
        await this.listingRepository
          .createQueryBuilder()
          .update(Listing)
          .set({ 
            isActive: false,
            status: ListingStatusEnum.EXPIRED,
          })
          .where('id = :listingId', { listingId: subscriptionEntity.listingId })
          .execute();
        this.logger.log(`Deactivated listing ${subscriptionEntity.listingId} due to PayPal subscription cancellation`);
      } catch (error) {
        this.logger.error(`Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
      }
    }
  }

  private async handlePayPalSubscriptionUpdated(event: any) {
    const subscriptionId = event.resource?.id;
    if (!subscriptionId) {
      this.logger.warn('⚠️ [PayPal Subscription Updated] No subscription ID in event');
      this.logger.warn('⚠️ [PayPal Subscription Updated] Event data:', JSON.stringify(event, null, 2));
      return;
    }

    this.logger.log(`🔔 [PayPal Subscription Updated] ========== START ==========`);
    this.logger.log(`🔔 [PayPal Subscription Updated] Processing subscription: ${subscriptionId}`);
    this.logger.log(`🔔 [PayPal Subscription Updated] Full event data:`, JSON.stringify(event, null, 2));

    const status = this.mapPayPalStatus(event.resource?.status);
    this.logger.log(`📊 [PayPal Subscription Updated] Mapped status: ${status} (from PayPal status: ${event.resource?.status})`);
    
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
    
    this.logger.log(`📊 [PayPal Subscription Updated] Subscription updated:`, {
      subscriptionId: subscription.id,
      listingId: subscription.listingId,
      status: subscription.status,
    });

    // Update listing based on subscription status
    if (subscription.listingId) {
      const inactiveStatuses = [
        SubscriptionStatusEnum.CANCELLED,
        SubscriptionStatusEnum.PAST_DUE,
        SubscriptionStatusEnum.UNPAID,
        SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
      ];

      // If subscription becomes inactive, deactivate listing
      if (inactiveStatuses.includes(status)) {
        try {
          await this.listingRepository
            .createQueryBuilder()
            .update(Listing)
            .set({ 
              isActive: false,
              status: ListingStatusEnum.EXPIRED,
            })
            .where('id = :listingId', { listingId: subscription.listingId })
            .execute();
          this.logger.log(`Deactivated listing ${subscription.listingId} due to PayPal subscription status: ${status}`);
        } catch (error) {
          this.logger.error(`Failed to deactivate listing ${subscription.listingId}:`, error);
        }
      } else if (status === SubscriptionStatusEnum.ACTIVE) {
        // If subscription is active, update listing expiration and status
        this.logger.log(`✅ [PayPal Subscription Updated] Subscription status is ACTIVE, checking listing...`);
        try {
          this.logger.log(`📋 [PayPal Subscription Updated] Fetching listing: ${subscription.listingId}`);
          const listing = await this.listingRepository.findOne({
            where: { id: subscription.listingId },
          });

          if (listing) {
            this.logger.log(`📋 [PayPal Subscription Updated] Listing found - BEFORE UPDATE:`, {
              listingId: listing.id,
              currentStatus: listing.status,
              isActive: listing.isActive,
              expiresAt: listing.expiresAt,
            });

            const updateData: Partial<Listing> = {};

            // Update expiration if provided
            if (event.resource?.billing_info?.next_billing_time) {
              updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
              this.logger.log(`📅 [PayPal Subscription Updated] Will update expiration to: ${updateData.expiresAt}`);
            }

            // Check if listing was recently created (within last 10 minutes) - indicates it's a new listing that needs admin approval
            const listingAge = Date.now() - new Date(listing.createdAt).getTime();
            const isRecentlyCreated = listingAge < 10 * 60 * 1000; // 10 minutes
            const hasNoPublishedAt = !listing.publishedAt; // Not yet approved by admin
            
            this.logger.log(`📊 [PayPal Subscription Updated] Listing metadata:`, {
              listingAge: `${Math.round(listingAge / 1000)}s`,
              isRecentlyCreated,
              hasNoPublishedAt,
              publishedAt: listing.publishedAt,
            });

            // If listing is in DRAFT status, change it to PENDING_REVIEW for admin approval
            if (listing.status === ListingStatusEnum.DRAFT) {
              updateData.status = ListingStatusEnum.PENDING_REVIEW;
              updateData.isActive = false;
              this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
              this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
            } else if (listing.status === ListingStatusEnum.EXPIRED) {
              // If listing is EXPIRED, reactivate it to PENDING_REVIEW for admin approval
              updateData.status = ListingStatusEnum.PENDING_REVIEW;
              updateData.isActive = false;
              this.logger.log(`🔄 [PayPal Subscription Updated] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
              this.logger.log(`🔄 [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
            } else if (listing.status === ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
              // CRITICAL FIX: If listing is ACTIVE but was recently created and not yet published (approved),
              // it means something incorrectly set it to ACTIVE. Change it to PENDING_REVIEW for admin approval.
              updateData.status = ListingStatusEnum.PENDING_REVIEW;
              updateData.isActive = false;
              this.logger.log(`🔧 [PayPal Subscription Updated] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
              this.logger.log(`🔧 [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
            } else if (listing.status === ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
              // Listing is already in PENDING_REVIEW, just update expiration
              this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
              this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
            } else if (event.resource?.billing_info?.next_billing_time) {
              // For other statuses, just update expiration
              this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
              this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
            } else {
              this.logger.log(`ℹ️ [PayPal Subscription Updated] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
            }

            if (Object.keys(updateData).length > 0) {
              this.logger.log(`💾 [PayPal Subscription Updated] Executing database update...`);
              await this.listingRepository
                .createQueryBuilder()
                .update(Listing)
                .set(updateData)
                .where('id = :listingId', { listingId: subscription.listingId })
                .execute();
              
              // Verify the update
              const updatedListing = await this.listingRepository.findOne({
                where: { id: subscription.listingId },
              });
              
              this.logger.log(`✅ [PayPal Subscription Updated] Listing updated - AFTER UPDATE:`, {
                listingId: updatedListing?.id,
                newStatus: updatedListing?.status,
                newIsActive: updatedListing?.isActive,
                newExpiresAt: updatedListing?.expiresAt,
              });
              
              if (updateData.status) {
                this.logger.log(`✅ [PayPal Subscription Updated] Listing status updated to ${updateData.status}: ${subscription.listingId}`);
              }
            } else {
              this.logger.log(`ℹ️ [PayPal Subscription Updated] No database update performed (updateData is empty)`);
            }
          } else {
            this.logger.warn(`⚠️ [PayPal Subscription Updated] Listing not found: ${subscription.listingId}`);
          }
        } catch (error) {
          this.logger.error(`❌ [PayPal Subscription Updated] Error updating listing ${subscription.listingId}:`, error);
          this.logger.error(`❌ [PayPal Subscription Updated] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        }
      } else {
        this.logger.log(`ℹ️ [PayPal Subscription Updated] Subscription status is ${status}, not ACTIVE. Skipping listing update.`);
      }
    } else {
      this.logger.warn(`⚠️ [PayPal Subscription Updated] Subscription ${subscriptionId} has no listingId`);
    }
    
    this.logger.log(`🔔 [PayPal Subscription Updated] ========== END ==========`);
  }

  private async handlePayPalPaymentCompleted(event: any) {
    this.logger.log(`🔔 [PayPal Payment Completed] ========== START ==========`);
    this.logger.log(`🔔 [PayPal Payment Completed] Full event data:`, JSON.stringify(event, null, 2));
    
    // Try multiple possible fields for subscription ID
    const subscriptionId = event.resource?.billing_agreement_id || 
                          event.resource?.subscription_id || 
                          event.resource?.id;
    if (!subscriptionId) {
      this.logger.warn(`⚠️ [PayPal Payment Completed] No subscription ID found in event: ${JSON.stringify(event.resource)}`);
      this.logger.log(`🔔 [PayPal Payment Completed] ========== END (NO SUBSCRIPTION ID) ==========`);
      return;
    }

    this.logger.log(`🔔 [PayPal Payment Completed] Processing subscription: ${subscriptionId}`);

    // Find subscription by subscriptionId (PayPal subscription ID)
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`⚠️ [PayPal Payment Completed] Subscription not found for ID: ${subscriptionId}`);
      this.logger.log(`🔔 [PayPal Payment Completed] ========== END (SUBSCRIPTION NOT FOUND) ==========`);
      return;
    }
    
    this.logger.log(`📊 [PayPal Payment Completed] Subscription found:`, {
      subscriptionId: subscription.id,
      listingId: subscription.listingId,
      status: subscription.status,
    });

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.ACTIVE,
      undefined,
      undefined,
      undefined,
      { lastPaymentSucceeded: new Date().toISOString(), saleId: event.resource?.id },
    );

    // Get payment amount and currency
    const amount = parseFloat(event.resource?.amount?.total || event.resource?.amount?.value || '0');
    const currency = event.resource?.amount?.currency || event.resource?.amount?.currency_code || subscription.currency || 'AUD';

    // Create payment record for this payment
    if (amount > 0) {
      // Check if payment record already exists for this sale/transaction
      const saleId = event.resource?.id;
      const existingPayment = saleId ? await this.paymentRepository.findOne({
        where: {
          metadata: {
            paypalSaleId: saleId,
          } as any,
        },
      }) : null;

      if (!existingPayment) {
        const payment = this.paymentRepository.create({
          userId: subscription.userId,
          listingId: subscription.listingId,
          paymentMethod: PaymentMethodEnum.PAYPAL,
          status: PaymentStatusEnum.SUCCEEDED,
          amount: amount,
          currency: currency,
          listingType: subscription.listingType,
          isFeatured: subscription.includesFeatured,
          metadata: {
            paypalSale: event.resource,
            paypalSaleId: saleId,
            subscriptionId: subscription.id,
            paypalSubscriptionId: subscriptionId,
            billingReason: 'subscription_renewal',
          },
        });

        await this.paymentRepository.save(payment);
        this.logger.log(`✅ Created payment record for PayPal subscription renewal: ${payment.id}`);
      }
    }

    // Handle renewal logging
    await this.subscriptionsService.handleSubscriptionRenewal(
      subscriptionId,
      amount,
      currency,
    );

    // Update listing status from DRAFT to PENDING_REVIEW after payment (don't auto-activate)
    if (subscription.listingId) {
      try {
        this.logger.log(`📋 [PayPal Payment Completed] Fetching listing: ${subscription.listingId}`);
        const listing = await this.listingRepository.findOne({
          where: { id: subscription.listingId },
        });

        if (listing) {
          this.logger.log(`📋 [PayPal Payment Completed] Listing found - BEFORE UPDATE:`, {
            listingId: listing.id,
            currentStatus: listing.status,
            isActive: listing.isActive,
            expiresAt: listing.expiresAt,
          });

          // Check if listing was recently created (within last 10 minutes) - indicates it's a new listing that needs admin approval
          const listingAge = Date.now() - new Date(listing.createdAt).getTime();
          const isRecentlyCreated = listingAge < 10 * 60 * 1000; // 10 minutes
          const hasNoPublishedAt = !listing.publishedAt; // Not yet approved by admin
          
          this.logger.log(`📊 [PayPal Payment Completed] Listing metadata:`, {
            listingAge: `${Math.round(listingAge / 1000)}s`,
            isRecentlyCreated,
            hasNoPublishedAt,
            publishedAt: listing.publishedAt,
          });

          // If listing is in DRAFT status, change to PENDING_REVIEW for admin approval
          if (listing.status === ListingStatusEnum.DRAFT) {
            const updateData: Partial<Listing> = {
              status: ListingStatusEnum.PENDING_REVIEW,
              isActive: false, // Keep inactive until admin approves
            };

            // Update expiration if provided
            if (event.resource?.billing_info?.next_billing_time) {
              updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
              this.logger.log(`📅 [PayPal Payment Completed] Will update expiration to: ${updateData.expiresAt}`);
            }

            this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
            this.logger.log(`⏳ [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));

            this.logger.log(`💾 [PayPal Payment Completed] Executing database update...`);
            await this.listingRepository
              .createQueryBuilder()
              .update(Listing)
              .set(updateData)
              .where('id = :listingId', { listingId: subscription.listingId })
              .execute();

            // Verify the update
            const updatedListing = await this.listingRepository.findOne({
              where: { id: subscription.listingId },
            });
            
            this.logger.log(`✅ [PayPal Payment Completed] Listing updated - AFTER UPDATE:`, {
              listingId: updatedListing?.id,
              newStatus: updatedListing?.status,
              newIsActive: updatedListing?.isActive,
              newExpiresAt: updatedListing?.expiresAt,
            });

            this.logger.log(`✅ [PayPal Payment Completed] Changed listing from DRAFT to PENDING_REVIEW, awaiting admin approval: ${subscription.listingId}`);
          } else if (listing.status === ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
            // CRITICAL FIX: If listing is ACTIVE but was recently created and not yet published (approved),
            // it means something incorrectly set it to ACTIVE. Change it to PENDING_REVIEW for admin approval.
            const updateData: Partial<Listing> = {
              status: ListingStatusEnum.PENDING_REVIEW,
              isActive: false,
            };

            // Update expiration if provided
            if (event.resource?.billing_info?.next_billing_time) {
              updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
              this.logger.log(`📅 [PayPal Payment Completed] Will update expiration to: ${updateData.expiresAt}`);
            }

            this.logger.log(`🔧 [PayPal Payment Completed] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
            this.logger.log(`🔧 [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));

            this.logger.log(`💾 [PayPal Payment Completed] Executing database update...`);
            await this.listingRepository
              .createQueryBuilder()
              .update(Listing)
              .set(updateData)
              .where('id = :listingId', { listingId: subscription.listingId })
              .execute();

            // Verify the update
            const updatedListing = await this.listingRepository.findOne({
              where: { id: subscription.listingId },
            });
            
            this.logger.log(`✅ [PayPal Payment Completed] Listing updated - AFTER UPDATE:`, {
              listingId: updatedListing?.id,
              newStatus: updatedListing?.status,
              newIsActive: updatedListing?.isActive,
              newExpiresAt: updatedListing?.expiresAt,
            });

            this.logger.log(`✅ [PayPal Payment Completed] Changed listing from ACTIVE to PENDING_REVIEW, awaiting admin approval: ${subscription.listingId}`);
          } else if (listing.status === ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
            // Listing is already in PENDING_REVIEW, just update expiration
            this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
            await this.updateListingExpiration(
              subscription.listingId,
              new Date(event.resource.billing_info.next_billing_time),
            );
            this.logger.log(`⏳ [PayPal Payment Completed] Updated listing expiration, keeping in PENDING_REVIEW: ${subscription.listingId}`);
          } else if (listing.status === ListingStatusEnum.EXPIRED && event.resource?.billing_info?.next_billing_time) {
            // If listing is EXPIRED, reactivate it to PENDING_REVIEW for admin approval
            const updateData: Partial<Listing> = {
              status: ListingStatusEnum.PENDING_REVIEW,
              isActive: false,
              expiresAt: new Date(event.resource.billing_info.next_billing_time),
            };
            this.logger.log(`🔄 [PayPal Payment Completed] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
            this.logger.log(`🔄 [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));
            
            await this.listingRepository
              .createQueryBuilder()
              .update(Listing)
              .set(updateData)
              .where('id = :listingId', { listingId: subscription.listingId })
              .execute();
            
            this.logger.log(`✅ [PayPal Payment Completed] Reactivated expired listing to PENDING_REVIEW: ${subscription.listingId}`);
          } else if (event.resource?.billing_info?.next_billing_time) {
            // For other statuses, just update expiration
            this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
            await this.updateListingExpiration(
              subscription.listingId,
              new Date(event.resource.billing_info.next_billing_time),
            );
          } else {
            this.logger.log(`ℹ️ [PayPal Payment Completed] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
          }
        } else {
          this.logger.warn(`⚠️ [PayPal Payment Completed] Listing not found: ${subscription.listingId}`);
        }
      } catch (error) {
        this.logger.error(`❌ [PayPal Payment Completed] Error updating listing ${subscription.listingId}:`, error);
        this.logger.error(`❌ [PayPal Payment Completed] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      }
    } else {
      this.logger.warn(`⚠️ [PayPal Payment Completed] Subscription ${subscriptionId} has no listingId`);
    }
    
    this.logger.log(`🔔 [PayPal Payment Completed] ========== END ==========`);
  }

  private async handlePayPalPaymentFailed(event: any) {
    // Try multiple possible fields for subscription ID
    const subscriptionId = event.resource?.billing_agreement_id || 
                          event.resource?.subscription_id || 
                          event.resource?.id;
    if (!subscriptionId) {
      this.logger.warn(`⚠️ [PayPal Payment Failed] No subscription ID found in event: ${JSON.stringify(event.resource)}`);
      return;
    }

    // Get subscription from database
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId },
    });

    await this.subscriptionsService.updateSubscriptionStatus(
      subscriptionId,
      SubscriptionStatusEnum.PAST_DUE,
      undefined,
      undefined,
      undefined,
      { lastPaymentFailed: new Date().toISOString(), saleId: event.resource?.id },
    );

    // Deactivate linked listing if payment fails
    if (subscription?.listingId) {
      try {
        await this.listingRepository
          .createQueryBuilder()
          .update(Listing)
          .set({ 
            isActive: false,
            status: ListingStatusEnum.EXPIRED,
          })
          .where('id = :listingId', { listingId: subscription.listingId })
          .execute();
        this.logger.log(`Deactivated listing ${subscription.listingId} due to PayPal payment failure`);
      } catch (error) {
        this.logger.error(`Failed to deactivate listing ${subscription.listingId}:`, error);
      }
    }
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

