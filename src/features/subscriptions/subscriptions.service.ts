import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Stripe from 'stripe';
import * as https from 'https';
import {
  Subscription,
  SubscriptionStatusEnum,
  SubscriptionPaymentMethodEnum,
} from './entities/subscription.entity';
import { Listing, ListingTypeEnum } from '../listings/entities/listing.entity';
import { PaymentLogsService, PaymentLogEventType } from '../payments/payment-logs.service';
import { Payment, PaymentMethodEnum, PaymentStatusEnum } from '../payments/entities/payment.entity';
import { config } from '../../config/config';

// PayPal SDK doesn't have proper ES6 exports, use require
const paypal = require('@paypal/checkout-server-sdk');

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;
  private paypalClient: any;

  // Stripe Price IDs - to be configured in environment variables
  private stripePriceIds: Record<string, string> = {
    SEMEN_LISTING: process.env.STRIPE_PRICE_ID_SEMEN || '',
    STUD_LISTING: process.env.STRIPE_PRICE_ID_STUD || '',
    FUTURE_LISTING: process.env.STRIPE_PRICE_ID_FUTURE || '',
    OTHER_SERVICES: process.env.STRIPE_PRICE_ID_OTHER_SERVICES || '',
    FEATURED_ADDON: process.env.STRIPE_PRICE_ID_FEATURED || '',
    PUPPY_LITTER_WITH_FEATURED: process.env.STRIPE_PRICE_ID_PUPPY_LITTER_WITH_FEATURED || '',
    PUPPY_LITTER_WITHOUT_FEATURED: process.env.STRIPE_PRICE_ID_PUPPY_LITTER_WITHOUT_FEATURED || '',
  };

  // PayPal Plan IDs - to be configured in environment variables
  private paypalPlanIds: Record<string, string> = {
    SEMEN_LISTING: process.env.PAYPAL_PLAN_ID_SEMEN || '',
    STUD_LISTING: process.env.PAYPAL_PLAN_ID_STUD || '',
    FUTURE_LISTING: process.env.PAYPAL_PLAN_ID_FUTURE || '',
    OTHER_SERVICES: process.env.PAYPAL_PLAN_ID_OTHER_SERVICES || '',
    FEATURED_ADDON: process.env.PAYPAL_PLAN_ID_FEATURED || '',
    PUPPY_LITTER_WITH_FEATURED: process.env.PAYPAL_PLAN_ID_PUPPY_LITTER_WITH_FEATURED || '',
    PUPPY_LITTER_WITHOUT_FEATURED: process.env.PAYPAL_PLAN_ID_PUPPY_LITTER_WITHOUT_FEATURED || '',
  };
  

  constructor(
    private configService: ConfigService,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paymentLogsService: PaymentLogsService,
  ) {
    // Initialize Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    } else {
      console.warn('STRIPE_SECRET_KEY not found in environment variables');
    }

    // Initialize PayPal
    const paypalClientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const paypalClientSecret = this.configService.get<string>('PAYPAL_SECRET');
    const paypalEnvironment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';

    if (paypalClientId && paypalClientSecret) {
      const environment =
        paypalEnvironment === 'production'
          ? new paypal.core.LiveEnvironment(paypalClientId, paypalClientSecret)
          : new paypal.core.SandboxEnvironment(paypalClientId, paypalClientSecret);

      this.paypalClient = new paypal.core.PayPalHttpClient(environment);
    } else {
      console.warn('PayPal credentials not found in environment variables');
    }
  }

  /**
   * Get subscription pricing for a listing type
   */
  private getSubscriptionPricing(listingType: string): { amount: number; currency: string } {
    const pricing: Record<string, number> = {
      SEMEN_LISTING: 19,
      STUD_LISTING: 39,
      FUTURE_LISTING: 19,
      OTHER_SERVICES: 19,
      FEATURED_ADDON: 79,
    };

    return {
      amount: pricing[listingType] || 0,
      currency: config.defaultPaymentCurrency,
    };
  }

  /**
   * Create Stripe subscription
   */
  async createStripeSubscription(
    userId: string,
    listingType: string,
    paymentMethodId?: string,
    listingId?: string,
    includesFeatured: boolean = false,
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    console.log('🔔 [Subscription] Starting Stripe subscription creation:', {
      userId,
      listingType,
      paymentMethodId,
      listingId,
      includesFeatured,
    });

    this.paymentLogsService.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_CREATED,
      userId,
      listingId,
      listingType,
      provider: 'stripe',
      metadata: {
        action: 'create_stripe_subscription_started',
        paymentMethodId,
        includesFeatured,
      },
    });

    if (!this.stripe) {
      const error = 'Stripe is not configured';
      console.error('❌ [Subscription]', error);
      this.paymentLogsService.logError({
        userId,
        provider: 'stripe',
        error: new Error(error),
        context: { listingType, listingId, includesFeatured },
      });
      throw new InternalServerErrorException(error);
    }

    try {
      // PUPPY_LITTER_LISTING is always a subscription (with or without featured)
      // PUPPY_LISTING is one-time payment, but can have featured add-on subscription
      const isOneTimePaymentType = ['PUPPY_LISTING'].includes(listingType);
      let pricing;
      if (listingType === 'PUPPY_LITTER_LISTING') {
        // For PUPPY_LITTER_LISTING, pricing is based on whether featured is included
        pricing = includesFeatured
          ? { amount: 128.00, currency: config.defaultPaymentCurrency.toLowerCase() }
          : { amount: 49.00, currency: config.defaultPaymentCurrency.toLowerCase() };
      } else if (isOneTimePaymentType && includesFeatured) {
        // For PUPPY_LISTING with featured, only charge for featured add-on subscription
        pricing = this.getSubscriptionPricing('FEATURED_ADDON');
      } else {
        pricing = this.getSubscriptionPricing(listingType);
      }
      
      console.log('🔔 [Subscription] Pricing determined:', {
        isOneTimePaymentType,
        includesFeatured,
        pricing,
        listingType,
      });
      
      // Get or create Stripe customer
      let customerId: string;
      const existingSubscription = await this.subscriptionRepository.findOne({
        where: { userId, paymentMethod: SubscriptionPaymentMethodEnum.STRIPE },
      });

      if (existingSubscription?.metadata?.customerId) {
        customerId = existingSubscription.metadata.customerId;
        console.log('🔔 [Subscription] Using existing customer:', customerId);
      } else {
        console.log('🔔 [Subscription] Creating new Stripe customer for user:', userId);
        // Create new customer
        const user = await this.listingRepository.manager
          .getRepository('users')
          .findOne({ where: { id: userId } });

        const customer = await this.stripe.customers.create({
          email: user?.email,
          metadata: { userId },
        });
        customerId = customer.id;
        console.log('✅ [Subscription] Stripe customer created:', customerId);
      }

      // Check if payment method can be used for subscription
      // Note: Payment methods used for one-time payments cannot be reused for subscriptions
      // If paymentMethodId is not provided, Payment Element will collect it on the frontend
      let finalPaymentMethodId = paymentMethodId;
      
      if (paymentMethodId) {
        console.log('🔔 [Subscription] Checking payment method:', { paymentMethodId, customerId });
        let paymentMethod;
        try {
          paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
          console.log('✅ [Subscription] Payment method retrieved:', {
            id: paymentMethod.id,
            customer: paymentMethod.customer,
            type: paymentMethod.type,
          });
        } catch (retrieveError: any) {
          console.error('❌ [Subscription] Failed to retrieve payment method:', retrieveError.message);
          throw new BadRequestException(
            'Payment method not found. Please use a different payment method.'
          );
        }

        // Check if payment method is already attached to this customer
        if (paymentMethod.customer && paymentMethod.customer === customerId) {
          console.log('✅ [Subscription] Payment method already attached to customer');
        } else if (paymentMethod.customer && paymentMethod.customer !== customerId) {
          // Payment method is attached to a different customer
          console.warn('⚠️ [Subscription] Payment method attached to different customer');
          throw new BadRequestException(
            'This payment method belongs to a different account. Please use a different payment method.'
          );
        } else {
          // Payment method is not attached - try to attach it
          try {
            console.log('🔔 [Subscription] Attaching payment method to customer');
            await this.stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });
            console.log('✅ [Subscription] Payment method attached successfully');
          } catch (attachError: any) {
            // If payment method was previously used for a one-time payment, it can't be reused
            if (
              attachError.code === 'resource_already_exists' ||
              attachError.message?.includes('previously used') ||
              attachError.message?.includes('detached from a Customer')
            ) {
              console.error('❌ [Subscription] Payment method cannot be reused:', attachError.message);
              this.paymentLogsService.logError({
                userId,
                provider: 'stripe',
                error: attachError instanceof Error ? attachError : new Error(attachError.message),
                context: {
                  listingType,
                  listingId,
                  includesFeatured,
                  paymentMethodId,
                  error: 'Payment method previously used for one-time payment',
                },
              });
              throw new BadRequestException(
                'This payment method was already used for a one-time payment and cannot be reused for subscriptions. ' +
                'Please add a new payment method in your account settings or use a different card.'
              );
            }
            throw attachError;
          }
        }

        // Set as default payment method
        console.log('🔔 [Subscription] Setting default payment method');
        await this.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        console.log('✅ [Subscription] Default payment method set');
      } else {
        console.log('🔔 [Subscription] No paymentMethodId provided - Payment Element will collect payment method on frontend');
      }

      // Create subscription items
      const items: Stripe.SubscriptionCreateParams.Item[] = [];
      
      // For PUPPY_LITTER_LISTING, always create subscription (with or without featured)
      if (listingType === 'PUPPY_LITTER_LISTING') {
        const priceId = includesFeatured
          ? this.stripePriceIds.PUPPY_LITTER_WITH_FEATURED
          : this.stripePriceIds.PUPPY_LITTER_WITHOUT_FEATURED;
        
        if (!priceId) {
          const error = `Stripe price ID not configured for PUPPY_LITTER_LISTING ${includesFeatured ? 'with' : 'without'} featured. Please set STRIPE_PRICE_ID_PUPPY_LITTER_${includesFeatured ? 'WITH' : 'WITHOUT'}_FEATURED in environment variables. See STRIPE_SETUP.md for setup instructions.`;
          console.error('❌ [Subscription]', error);
          this.paymentLogsService.logError({
            userId,
            provider: 'stripe',
            error: new Error(error),
            context: { listingType, listingId, includesFeatured },
          });
          throw new BadRequestException(error);
        }
        items.push({
          price: priceId,
        });
        console.log(`🔔 [Subscription] Added PUPPY_LITTER_LISTING subscription (${includesFeatured ? '$128' : '$49'}/month):`, priceId);
      } else if (isOneTimePaymentType && includesFeatured) {
        // For other one-time payment types (like PUPPY_LISTING) with featured add-on
        const featuredPriceId = this.stripePriceIds.FEATURED_ADDON;
        if (!featuredPriceId) {
          const error = 'Stripe price ID not configured for featured add-on. Please set STRIPE_PRICE_ID_FEATURED in environment variables. See STRIPE_SETUP.md for setup instructions.';
          console.error('❌ [Subscription]', error);
          this.paymentLogsService.logError({
            userId,
            provider: 'stripe',
            error: new Error(error),
            context: { listingType, listingId, includesFeatured },
          });
          throw new BadRequestException(error);
        }
        items.push({
          price: featuredPriceId,
        });
        console.log('🔔 [Subscription] Added featured add-on item:', featuredPriceId);
      } else {
        // For subscription-based listing types, add base subscription
        const priceId = this.stripePriceIds[listingType];
        if (!priceId) {
          const error = `Stripe price ID not configured for ${listingType}. Please set the corresponding STRIPE_PRICE_ID_* environment variable. See STRIPE_SETUP.md for setup instructions.`;
          console.error('❌ [Subscription]', error);
          this.paymentLogsService.logError({
            userId,
            provider: 'stripe',
            error: new Error(error),
            context: { listingType, listingId, includesFeatured },
          });
          throw new BadRequestException(error);
        }
        items.push({
          price: priceId,
        });
        console.log('🔔 [Subscription] Added base subscription item:', priceId);
        
        // Add featured add-on if applicable
        if (includesFeatured && this.stripePriceIds.FEATURED_ADDON) {
          items.push({
            price: this.stripePriceIds.FEATURED_ADDON,
          });
          console.log('🔔 [Subscription] Added featured add-on item:', this.stripePriceIds.FEATURED_ADDON);
        }
      }

      console.log('🔔 [Subscription] Creating Stripe subscription with items:', items);
      // Create subscription
      // If paymentMethodId is provided, use it; otherwise Payment Element will collect it
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          listingId: listingId || '',
          listingType,
          includesFeatured: includesFeatured.toString(),
        },
      };

      // If payment method is already attached, we can set it as default
      if (finalPaymentMethodId) {
        subscriptionParams.default_payment_method = finalPaymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);
      console.log('✅ [Subscription] Stripe subscription created:', subscription.id);

      // Calculate total amount
      let totalAmount = pricing.amount;
      if (listingType === 'PUPPY_LITTER_LISTING') {
        // For PUPPY_LITTER_LISTING, it's always a subscription
        totalAmount = includesFeatured ? 128.00 : 49.00;
      } else if (isOneTimePaymentType && includesFeatured) {
        // For other one-time payment types with featured, it's $79/month (just featured add-on)
        totalAmount = this.getSubscriptionPricing('FEATURED_ADDON').amount;
      } else if (!isOneTimePaymentType && includesFeatured) {
        // For subscription types, add featured add-on price
        totalAmount += this.getSubscriptionPricing('FEATURED_ADDON').amount;
      }

      console.log('🔔 [Subscription] Saving subscription to database:', {
        userId,
        listingId,
        subscriptionId: subscription.id,
        totalAmount,
        status: subscription.status,
      });

      // Save subscription to database
      const subscriptionEntity = this.subscriptionRepository.create({
        userId,
        listingId: listingId || null,
        subscriptionId: subscription.id,
        paymentMethod: SubscriptionPaymentMethodEnum.STRIPE,
        status: this.mapStripeStatusToSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        amount: totalAmount,
        currency: pricing.currency,
        listingType,
        includesFeatured,
        metadata: {
          stripeSubscription: subscription,
          customerId,
          paymentMethodId: finalPaymentMethodId || 'collected_via_payment_element',
        },
      });

      const savedSubscription = await this.subscriptionRepository.save(subscriptionEntity);
      console.log('✅ [Subscription] Subscription saved to database with ID:', savedSubscription.id);

      // Create payment record for the initial subscription payment if invoice is paid
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if (invoice && invoice.status === 'paid' && invoice.payment_intent) {
        try {
          // Handle payment_intent which can be string (ID) or PaymentIntent object
          const paymentIntentId = typeof invoice.payment_intent === 'string' 
            ? invoice.payment_intent 
            : invoice.payment_intent.id;
          const charge = invoice.charge as Stripe.Charge;
          
          // Check if payment record already exists
          const existingPayment = await this.paymentRepository.findOne({
            where: { paymentIntentId },
          });

          if (!existingPayment) {
            const payment = this.paymentRepository.create({
              userId,
              listingId: listingId || null,
              paymentMethod: PaymentMethodEnum.STRIPE,
              status: PaymentStatusEnum.SUCCEEDED,
              amount: totalAmount,
              currency: pricing.currency,
              paymentIntentId: paymentIntentId,
              paymentMethodId: charge?.payment_method as string || finalPaymentMethodId || null,
              listingType,
              isFeatured: includesFeatured,
              metadata: {
                stripeInvoice: invoice,
                stripeCharge: charge,
                subscriptionId: savedSubscription.id,
                stripeSubscriptionId: subscription.id,
                billingReason: invoice.billing_reason || 'subscription_create',
              },
            });

            await this.paymentRepository.save(payment);
            console.log('✅ [Subscription] Created payment record for initial subscription payment:', payment.id);
          } else {
            // Update existing payment if it was pending
            if (existingPayment.status === PaymentStatusEnum.PENDING) {
              existingPayment.status = PaymentStatusEnum.SUCCEEDED;
              existingPayment.metadata = {
                ...existingPayment.metadata,
                stripeInvoice: invoice,
                stripeCharge: charge,
                subscriptionId: savedSubscription.id,
                stripeSubscriptionId: subscription.id,
                billingReason: invoice.billing_reason || 'subscription_create',
              };
              await this.paymentRepository.save(existingPayment);
              console.log('✅ [Subscription] Updated payment record to succeeded:', existingPayment.id);
            }
          }
        } catch (paymentError) {
          console.error('❌ [Subscription] Error creating payment record:', paymentError);
          // Don't throw - subscription is already created
        }
      }

      // Log subscription creation
      console.log('🔔 [Subscription] Logging subscription creation to payment logs');
      this.paymentLogsService.logSubscriptionCreated({
        userId,
        subscriptionId: savedSubscription.id,
        listingId: listingId,
        amount: totalAmount,
        currency: pricing.currency,
        provider: 'stripe',
        listingType,
        includesFeatured,
        metadata: { 
          stripeSubscriptionId: subscription.id,
          customerId,
          paymentMethodId: finalPaymentMethodId || 'collected_via_payment_element',
          status: subscription.status,
        },
      });
      console.log('✅ [Subscription] Subscription creation logged successfully');
      console.log('✅ [Subscription] Stripe subscription creation completed:', {
        databaseId: savedSubscription.id,
        stripeSubscriptionId: subscription.id,
        listingId,
        amount: totalAmount,
        status: subscription.status,
      });

      // Get client secret from invoice payment intent if available
      // Reuse the invoice variable declared earlier
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;
      const clientSecret = paymentIntent?.client_secret;

      return {
        subscriptionId: savedSubscription.id,
        clientSecret,
      };
    } catch (error: any) {
      console.error('❌ [Subscription] Error creating Stripe subscription:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        userId,
        listingType,
        listingId,
        includesFeatured,
      });
      
      this.paymentLogsService.logError({
        userId,
        provider: 'stripe',
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { listingType, listingId, includesFeatured, errorCode: error.code },
      });

      throw new BadRequestException(
        error.message || 'Failed to create Stripe subscription',
      );
    }
  }

  /**
   * Create PayPal subscription
   */
  async createPayPalSubscription(
    userId: string,
    listingType: string,
    listingId?: string,
    includesFeatured: boolean = false,
  ): Promise<{ subscriptionId: string; approvalUrl: string }> {
    console.log('🔔 [Subscription] Starting PayPal subscription creation:', {
      userId,
      listingType,
      listingId,
      includesFeatured,
    });

    this.paymentLogsService.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_CREATED,
      userId,
      listingId,
      listingType,
      provider: 'paypal',
      metadata: {
        action: 'create_paypal_subscription_started',
        includesFeatured,
      },
    });

    if (!this.paypalClient) {
      const error = 'PayPal is not configured';
      console.error('❌ [Subscription]', error);
      this.paymentLogsService.logError({
        userId,
        provider: 'paypal',
        error: new Error(error),
        context: { listingType, listingId, includesFeatured },
      });
      throw new InternalServerErrorException(error);
    }

    try {
      // PUPPY_LITTER_LISTING is always a subscription (with or without featured)
      // PUPPY_LISTING is one-time payment, but can have featured add-on subscription
      const isOneTimePaymentType = ['PUPPY_LISTING'].includes(listingType);
      let pricing;
      if (listingType === 'PUPPY_LITTER_LISTING') {
        // For PUPPY_LITTER_LISTING, pricing is based on whether featured is included
        pricing = includesFeatured
          ? { amount: 128.00, currency: config.defaultPaymentCurrency.toLowerCase() }
          : { amount: 49.00, currency: config.defaultPaymentCurrency.toLowerCase() };
      } else if (isOneTimePaymentType && includesFeatured) {
        // For PUPPY_LISTING with featured, only charge for featured add-on subscription
        pricing = this.getSubscriptionPricing('FEATURED_ADDON');
      } else {
        pricing = this.getSubscriptionPricing(listingType);
      }
      
      console.log('🔔 [Subscription] Pricing determined:', {
        isOneTimePaymentType,
        includesFeatured,
        pricing,
        listingType,
      });
      
      // For one-time payment types with featured add-on, use combined $128/month plan ID
      const planId = listingType === 'PUPPY_LITTER_LISTING'
        ? (includesFeatured
            ? this.paypalPlanIds.PUPPY_LITTER_WITH_FEATURED
            : this.paypalPlanIds.PUPPY_LITTER_WITHOUT_FEATURED)
        : (isOneTimePaymentType && includesFeatured
            ? this.paypalPlanIds.PUPPY_WITH_FEATURED
            : this.paypalPlanIds[listingType]);

      if (!planId) {
        const error = isOneTimePaymentType && includesFeatured
          ? 'PayPal plan ID not configured for featured add-on'
          : `PayPal plan ID not configured for ${listingType}`;
        console.error('❌ [Subscription]', error);
        this.paymentLogsService.logError({
          userId,
          provider: 'paypal',
          error: new Error(error),
          context: { listingType, listingId, includesFeatured },
        });
        throw new BadRequestException(error);
      }

      console.log('🔔 [Subscription] Using PayPal plan ID:', planId);

      // Get PayPal access token
      const accessToken = await this.getPayPalAccessToken();
      
      // Create subscription using PayPal REST API
      const subscriptionData = {
        plan_id: planId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start 1 minute from now
        subscriber: {
          payer_id: userId, // This will be updated when user approves
        },
        application_context: {
          brand_name: 'Pups4Sale',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${this.configService.get('siteUrl')}/paypal/subscription/callback?success=true`,
          cancel_url: `${this.configService.get('siteUrl')}/paypal/subscription/callback?canceled=true`,
        },
        custom_id: userId,
      };

      console.log('🔔 [Subscription] Creating PayPal subscription via REST API');
      const paypalSubscription = await this.paypalApiRequest(
        accessToken,
        'POST',
        '/v1/billing/subscriptions',
        subscriptionData
      );
      
      console.log('✅ [Subscription] PayPal subscription created:', paypalSubscription.id);
      
      // Get approval URL from links
      const approvalLink = paypalSubscription.links?.find(
        (link: any) => link.rel === 'approve',
      );
      const approvalUrl = approvalLink?.href || '';

      // Calculate total amount
      let totalAmount = pricing.amount;
      if (listingType === 'PUPPY_LITTER_LISTING') {
        // For PUPPY_LITTER_LISTING, it's always a subscription
        totalAmount = includesFeatured ? 128.00 : 49.00;
      } else if (isOneTimePaymentType && includesFeatured) {
        // For other one-time payment types with featured, it's $79/month (just featured add-on)
        totalAmount = this.getSubscriptionPricing('FEATURED_ADDON').amount;
      } else if (!isOneTimePaymentType && includesFeatured) {
        // For subscription types, add featured add-on price
        totalAmount += this.getSubscriptionPricing('FEATURED_ADDON').amount;
      }

      console.log('🔔 [Subscription] Saving PayPal subscription to database:', {
        userId,
        listingId,
        subscriptionId: paypalSubscription.id,
        totalAmount,
      });

      // Save subscription to database (status will be updated when approved)
      const subscriptionEntity = this.subscriptionRepository.create({
        userId,
        listingId: listingId || null,
        subscriptionId: paypalSubscription.id,
        paymentMethod: SubscriptionPaymentMethodEnum.PAYPAL,
        status: SubscriptionStatusEnum.INCOMPLETE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amount: totalAmount,
        currency: pricing.currency,
        listingType,
        includesFeatured,
        metadata: {
          paypalSubscription: paypalSubscription,
        },
      });

      const savedSubscription = await this.subscriptionRepository.save(subscriptionEntity);
      console.log('✅ [Subscription] PayPal subscription saved to database with ID:', savedSubscription.id);

      // Log subscription creation
      console.log('🔔 [Subscription] Logging PayPal subscription creation to payment logs');
      this.paymentLogsService.logSubscriptionCreated({
        userId,
        subscriptionId: savedSubscription.id,
        listingId: listingId,
        amount: totalAmount,
        currency: pricing.currency,
        provider: 'paypal',
        listingType,
        includesFeatured,
        metadata: { 
          paypalSubscriptionId: paypalSubscription.id,
          status: paypalSubscription.status,
          approvalUrl: paypalSubscription.links?.find((link: any) => link.rel === 'approve')?.href,
        },
      });
      console.log('✅ [Subscription] PayPal subscription creation logged successfully');
      console.log('✅ [Subscription] PayPal subscription creation completed:', {
        databaseId: savedSubscription.id,
        paypalSubscriptionId: paypalSubscription.id,
        listingId,
        amount: totalAmount,
        approvalUrl,
      });

      return {
        subscriptionId: savedSubscription.id,
        approvalUrl,
      };
    } catch (error: any) {
      console.error('❌ [Subscription] Error creating PayPal subscription:', {
        error: error.message,
        stack: error.stack,
        userId,
        listingType,
        listingId,
        includesFeatured,
      });
      
      this.paymentLogsService.logError({
        userId,
        provider: 'paypal',
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { listingType, listingId, includesFeatured },
      });

      throw new BadRequestException(
        error.message || 'Failed to create PayPal subscription',
      );
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string, syncFromStripe: boolean = false): Promise<Subscription[]> {
    // If syncFromStripe is true, fetch from Stripe and sync with database
    if (syncFromStripe && this.stripe) {
      await this.syncSubscriptionsFromStripe(userId);
    }

    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has an active subscription for a specific listing type
   */
  async hasActiveSubscriptionForListingType(
    userId: string,
    listingType: string,
  ): Promise<{ hasSubscription: boolean; subscription?: Subscription }> {
    const activeStatuses = [
      SubscriptionStatusEnum.ACTIVE,
      SubscriptionStatusEnum.TRIALING,
    ];

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        listingType,
        status: In(activeStatuses) as any,
      },
    });

    // Also check if subscription is still valid (not expired)
    if (subscription) {
      const now = new Date();
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
        return { hasSubscription: true, subscription };
      }
    }

    return { hasSubscription: false };
  }

  /**
   * Sync subscriptions from Stripe for a user
   */
  async syncSubscriptionsFromStripe(userId: string): Promise<void> {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }

    try {
      // Find all existing subscriptions for this user to get their Stripe customer IDs
      const existingSubscriptions = await this.subscriptionRepository.find({
        where: { userId, paymentMethod: SubscriptionPaymentMethodEnum.STRIPE },
      });

      // Collect unique customer IDs from existing subscriptions
      const customerIds = new Set<string>();
      existingSubscriptions.forEach((sub) => {
        if (sub.metadata?.customerId) {
          customerIds.add(sub.metadata.customerId);
        }
      });

      // If no customer IDs found, try to find by searching subscriptions with user metadata
      if (customerIds.size === 0) {
        // Search Stripe subscriptions by metadata userId
        // Note: Stripe only allows 4 levels of expansion, so we can't expand product
        const stripeSubscriptions = await this.stripe.subscriptions.list({
          limit: 100,
          expand: ['data.customer', 'data.items.data.price'],
        });

        // Filter subscriptions that match this userId in metadata
        for (const stripeSub of stripeSubscriptions.data) {
          if (stripeSub.metadata?.userId === userId) {
            const customerId = typeof stripeSub.customer === 'string' 
              ? stripeSub.customer 
              : stripeSub.customer?.id;

            if (customerId) {
              customerIds.add(customerId);
            }
          }
        }
      }

      // Fetch all subscriptions for each customer
      for (const customerId of customerIds) {
        // Note: Stripe only allows 4 levels of expansion, so we can't expand product
        const stripeSubscriptions = await this.stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          expand: ['data.customer', 'data.items.data.price'],
        });

        // Sync each subscription to database
        for (const stripeSub of stripeSubscriptions.data) {
          // Check if subscription already exists
          const existingSub = await this.subscriptionRepository.findOne({
            where: { subscriptionId: stripeSub.id },
          });

          if (existingSub) {
            // Update existing subscription
            existingSub.status = this.mapStripeStatusToSubscriptionStatus(stripeSub.status);
            existingSub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
            existingSub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            existingSub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
            existingSub.canceledAt = stripeSub.canceled_at 
              ? new Date(stripeSub.canceled_at * 1000) 
              : null;

            // Calculate amount from subscription items
            const totalAmount = stripeSub.items.data.reduce((sum, item) => {
              return sum + (item.price.unit_amount || 0);
            }, 0);
            existingSub.amount = totalAmount / 100; // Convert from cents

            existingSub.metadata = {
              ...existingSub.metadata,
              stripeSubscription: stripeSub,
              customerId,
            };

            await this.subscriptionRepository.save(existingSub);
          } else {
            // Create new subscription if it doesn't exist and has userId in metadata
            if (stripeSub.metadata?.userId === userId) {
              const totalAmount = stripeSub.items.data.reduce((sum, item) => {
                return sum + (item.price.unit_amount || 0);
              }, 0);

              // Determine listing type and featured status from subscription items
              let listingType: string | null = null;
              let includesFeatured = false;

              for (const item of stripeSub.items.data) {
                const priceId = item.price.id;
                // Check if this is a featured add-on
                if (priceId === this.stripePriceIds.FEATURED_ADDON) {
                  includesFeatured = true;
                } else {
                  // Find listing type from price ID
                  for (const [type, id] of Object.entries(this.stripePriceIds)) {
                    if (id === priceId && type !== 'FEATURED_ADDON') {
                      listingType = type;
                      break;
                    }
                  }
                }
              }

              const newSubscription = this.subscriptionRepository.create({
                userId,
                listingId: stripeSub.metadata?.listingId || null,
                subscriptionId: stripeSub.id,
                paymentMethod: SubscriptionPaymentMethodEnum.STRIPE,
                status: this.mapStripeStatusToSubscriptionStatus(stripeSub.status),
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                canceledAt: stripeSub.canceled_at 
                  ? new Date(stripeSub.canceled_at * 1000) 
                  : null,
                amount: totalAmount / 100,
                currency: stripeSub.currency.toUpperCase(),
                listingType,
                includesFeatured,
                metadata: {
                  stripeSubscription: stripeSub,
                  customerId,
                },
              });

              await this.subscriptionRepository.save(newSubscription);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error syncing subscriptions from Stripe:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to sync subscriptions from Stripe',
      );
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(
    subscriptionId: string,
    userId?: string,
  ): Promise<Subscription> {
    const where: any = { id: subscriptionId };
    if (userId) {
      where.userId = userId;
    }

    const subscription = await this.subscriptionRepository.findOne({ where });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    userId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    try {
      if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.STRIPE) {
        if (!this.stripe) {
          throw new InternalServerErrorException('Stripe is not configured');
        }

        let stripeSubscription;
        
        if (cancelAtPeriodEnd) {
          // Schedule cancellation at period end
          stripeSubscription = await this.stripe.subscriptions.update(
            subscription.subscriptionId,
            {
              cancel_at_period_end: true,
            },
          );
          subscription.cancelAtPeriodEnd = true;
          subscription.canceledAt = null;
        } else {
          // Cancel immediately
          stripeSubscription = await this.stripe.subscriptions.cancel(
            subscription.subscriptionId,
          );
          subscription.cancelAtPeriodEnd = false;
          subscription.canceledAt = new Date();
        }

        subscription.status = this.mapStripeStatusToSubscriptionStatus(
          stripeSubscription.status,
        );
        subscription.metadata = {
          ...subscription.metadata,
          stripeSubscription,
        };
      } else if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.PAYPAL) {
        if (!this.paypalClient) {
          throw new InternalServerErrorException('PayPal is not configured');
        }

        const request = new paypal.subscriptions.SubscriptionsCancelRequest(
          subscription.subscriptionId,
        );
        request.requestBody({
          reason: cancelAtPeriodEnd ? 'User requested cancellation at period end' : 'User requested immediate cancellation',
        });

        await this.paypalClient.execute(request);

        subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
        subscription.canceledAt = cancelAtPeriodEnd ? null : new Date();
        subscription.status = cancelAtPeriodEnd
          ? SubscriptionStatusEnum.ACTIVE
          : SubscriptionStatusEnum.CANCELLED;
      }

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      // Log cancellation
      this.paymentLogsService.logSubscriptionCancelled({
        userId,
        subscriptionId: updatedSubscription.id,
        listingId: updatedSubscription.listingId,
        cancelAtPeriodEnd,
        provider: subscription.paymentMethod,
        metadata: { originalSubscriptionId: subscription.subscriptionId },
      });

      return updatedSubscription;
    } catch (error: any) {
      this.paymentLogsService.logError({
        userId,
        subscriptionId: subscription.id,
        provider: subscription.paymentMethod,
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { cancelAtPeriodEnd },
      });

      throw new BadRequestException(
        error.message || 'Failed to cancel subscription',
      );
    }
  }

  /**
   * Update subscription (add/remove featured add-on)
   */
  async updateSubscription(
    subscriptionId: string,
    userId: string,
    includesFeatured: boolean,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    if (subscription.includesFeatured === includesFeatured) {
      return subscription; // No change needed
    }

    try {
      if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.STRIPE) {
        if (!this.stripe) {
          throw new InternalServerErrorException('Stripe is not configured');
        }

        const featuredPriceId = this.stripePriceIds.FEATURED_ADDON;
        if (!featuredPriceId) {
          throw new BadRequestException('Featured add-on price ID not configured');
        }

        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          subscription.subscriptionId,
        );

        if (includesFeatured) {
          // Add featured add-on
          await this.stripe.subscriptionItems.create({
            subscription: subscription.subscriptionId,
            price: featuredPriceId,
          });
        } else {
          // Remove featured add-on
          const featuredItem = stripeSubscription.items.data.find(
            (item) => item.price.id === featuredPriceId,
          );
          if (featuredItem) {
            await this.stripe.subscriptionItems.del(featuredItem.id);
          }
        }

        // Update subscription
        const updatedStripeSubscription = await this.stripe.subscriptions.retrieve(
          subscription.subscriptionId,
        );

        subscription.includesFeatured = includesFeatured;
        subscription.amount =
          this.getSubscriptionPricing(subscription.listingType || '').amount +
          (includesFeatured ? this.getSubscriptionPricing('FEATURED_ADDON').amount : 0);
        subscription.metadata = {
          ...subscription.metadata,
          stripeSubscription: updatedStripeSubscription,
        };
      } else if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.PAYPAL) {
        // PayPal subscription updates require plan modification
        // For simplicity, we'll cancel and create a new one
        // In production, you might want to use PayPal's plan update API
        throw new BadRequestException(
          'PayPal subscription updates are not yet supported. Please cancel and create a new subscription.',
        );
      }

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      // Log update
      this.paymentLogsService.logSubscriptionUpdated({
        userId,
        subscriptionId: updatedSubscription.id,
        listingId: updatedSubscription.listingId,
        provider: subscription.paymentMethod,
        changes: { includesFeatured },
        metadata: { originalSubscriptionId: subscription.subscriptionId },
      });

      return updatedSubscription;
    } catch (error: any) {
      this.paymentLogsService.logError({
        userId,
        subscriptionId: subscription.id,
        provider: subscription.paymentMethod,
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { includesFeatured },
      });

      throw new BadRequestException(
        error.message || 'Failed to update subscription',
      );
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    subscriptionId: string,
    userId: string,
    paymentMethodId: string,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    try {
      if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.STRIPE) {
        if (!this.stripe) {
          throw new InternalServerErrorException('Stripe is not configured');
        }

        // Attach payment method to customer
        const customerId = subscription.metadata?.customerId;
        if (!customerId) {
          throw new BadRequestException('Customer ID not found in subscription');
        }

        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Update subscription default payment method
        await this.stripe.subscriptions.update(subscription.subscriptionId, {
          default_payment_method: paymentMethodId,
        });

        // Update customer default payment method
        await this.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        subscription.metadata = {
          ...subscription.metadata,
          paymentMethodId,
        };
      } else if (subscription.paymentMethod === SubscriptionPaymentMethodEnum.PAYPAL) {
        // PayPal payment method updates require re-approval
        throw new BadRequestException(
          'PayPal payment method updates require re-approval. Please cancel and create a new subscription.',
        );
      }

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      // Log payment method update
      this.paymentLogsService.logPaymentMethodUpdated({
        userId,
        subscriptionId: updatedSubscription.id,
        provider: subscription.paymentMethod,
        metadata: { paymentMethodId },
      });

      return updatedSubscription;
    } catch (error: any) {
      this.paymentLogsService.logError({
        userId,
        subscriptionId: subscription.id,
        provider: subscription.paymentMethod,
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { paymentMethodId },
      });

      throw new BadRequestException(
        error.message || 'Failed to update payment method',
      );
    }
  }

  /**
   * Update subscription status from webhook
   */
  async updateSubscriptionStatus(
    providerSubscriptionId: string,
    status: SubscriptionStatusEnum,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date,
    cancelAtPeriodEnd?: boolean,
    metadata?: Record<string, any>,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId: providerSubscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found: ${providerSubscriptionId}`,
      );
    }

    subscription.status = status;
    if (currentPeriodStart) subscription.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) subscription.currentPeriodEnd = currentPeriodEnd;
    if (cancelAtPeriodEnd !== undefined)
      subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
    if (metadata) {
      subscription.metadata = { ...subscription.metadata, ...metadata };
    }

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Handle subscription renewal
   */
  async handleSubscriptionRenewal(
    providerSubscriptionId: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscriptionId: providerSubscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription not found: ${providerSubscriptionId}`,
      );
    }

    // Update period dates if available from provider
    // This will be handled by webhook events

    // Log renewal
    this.paymentLogsService.logSubscriptionRenewed({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      listingId: subscription.listingId,
      amount,
      currency,
      provider: subscription.paymentMethod,
      currentPeriodEnd: subscription.currentPeriodEnd,
      metadata: { providerSubscriptionId },
    });
  }

  /**
   * Map Stripe subscription status to our status enum
   */
  private mapStripeStatusToSubscriptionStatus(
    stripeStatus: string,
  ): SubscriptionStatusEnum {
    const statusMap: Record<string, SubscriptionStatusEnum> = {
      active: SubscriptionStatusEnum.ACTIVE,
      canceled: SubscriptionStatusEnum.CANCELLED,
      incomplete: SubscriptionStatusEnum.INCOMPLETE,
      incomplete_expired: SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatusEnum.PAST_DUE,
      trialing: SubscriptionStatusEnum.TRIALING,
      unpaid: SubscriptionStatusEnum.UNPAID,
    };

    return statusMap[stripeStatus] || SubscriptionStatusEnum.ACTIVE;
  }

  /**
   * Map PayPal subscription status to our status enum
   */
  private mapPayPalStatusToSubscriptionStatus(
    paypalStatus: string,
  ): SubscriptionStatusEnum {
    const statusMap: Record<string, SubscriptionStatusEnum> = {
      APPROVAL_PENDING: SubscriptionStatusEnum.INCOMPLETE,
      APPROVED: SubscriptionStatusEnum.ACTIVE,
      ACTIVE: SubscriptionStatusEnum.ACTIVE,
      SUSPENDED: SubscriptionStatusEnum.PAST_DUE,
      CANCELLED: SubscriptionStatusEnum.CANCELLED,
      EXPIRED: SubscriptionStatusEnum.EXPIRED,
    };

    return statusMap[paypalStatus] || SubscriptionStatusEnum.INCOMPLETE;
  }

  /**
   * Sync PayPal subscription status from PayPal API
   */
  async syncPayPalSubscriptionStatus(
    subscriptionId: string,
    userId: string,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId, userId);

    if (subscription.paymentMethod !== SubscriptionPaymentMethodEnum.PAYPAL) {
      throw new BadRequestException('Subscription is not a PayPal subscription');
    }

    try {
      const accessToken = await this.getPayPalAccessToken();
      const paypalSubscription = await this.paypalApiRequest(
        accessToken,
        'GET',
        `/v1/billing/subscriptions/${subscription.subscriptionId}`,
      );

      const paypalStatus = paypalSubscription.status;
      const mappedStatus = this.mapPayPalStatusToSubscriptionStatus(paypalStatus);

      // Update subscription status and metadata
      subscription.status = mappedStatus;
      subscription.metadata = {
        ...subscription.metadata,
        paypalSubscription,
      };

      // Update period dates if available
      if (paypalSubscription.start_time) {
        subscription.currentPeriodStart = new Date(paypalSubscription.start_time);
      }
      if (paypalSubscription.billing_info?.next_billing_time) {
        subscription.currentPeriodEnd = new Date(
          paypalSubscription.billing_info.next_billing_time,
        );
      }

      return await this.subscriptionRepository.save(subscription);
    } catch (error: any) {
      this.paymentLogsService.logError({
        userId,
        subscriptionId: subscription.id,
        provider: 'paypal',
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
        context: { action: 'syncPayPalSubscriptionStatus' },
      });

      throw new BadRequestException(
        error.message || 'Failed to sync PayPal subscription status',
      );
    }
  }

  /**
   * Get PayPal access token
   */
  private async getPayPalAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';
    const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('PayPal credentials not configured');
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

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const tokenData = JSON.parse(data);
            resolve(tokenData.access_token);
          } else {
            reject(new Error(`Failed to get PayPal access token: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write('grant_type=client_credentials');
      req.end();
    });
  }

  /**
   * Make PayPal API request
   */
  private async paypalApiRequest(
    accessToken: string,
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';
    const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path,
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`PayPal API request failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}

