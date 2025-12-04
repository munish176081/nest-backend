"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stripe_1 = require("stripe");
const https = require("https");
const subscription_entity_1 = require("./entities/subscription.entity");
const listing_entity_1 = require("../listings/entities/listing.entity");
const payment_logs_service_1 = require("../payments/payment-logs.service");
const payment_entity_1 = require("../payments/entities/payment.entity");
const config_2 = require("../../config/config");
const paypal = require('@paypal/checkout-server-sdk');
let SubscriptionsService = class SubscriptionsService {
    constructor(configService, subscriptionRepository, listingRepository, paymentRepository, paymentLogsService) {
        this.configService = configService;
        this.subscriptionRepository = subscriptionRepository;
        this.listingRepository = listingRepository;
        this.paymentRepository = paymentRepository;
        this.paymentLogsService = paymentLogsService;
        this.stripePriceIds = {
            SEMEN_LISTING: process.env.STRIPE_PRICE_ID_SEMEN || '',
            STUD_LISTING: process.env.STRIPE_PRICE_ID_STUD || '',
            FUTURE_LISTING: process.env.STRIPE_PRICE_ID_FUTURE || '',
            OTHER_SERVICES: process.env.STRIPE_PRICE_ID_OTHER_SERVICES || '',
            FEATURED_ADDON: process.env.STRIPE_PRICE_ID_FEATURED || '',
            PUPPY_LITTER_WITH_FEATURED: process.env.STRIPE_PRICE_ID_PUPPY_LITTER_WITH_FEATURED || '',
            PUPPY_LITTER_WITHOUT_FEATURED: process.env.STRIPE_PRICE_ID_PUPPY_LITTER_WITHOUT_FEATURED || '',
        };
        this.paypalPlanIds = {
            SEMEN_LISTING: process.env.PAYPAL_PLAN_ID_SEMEN || '',
            STUD_LISTING: process.env.PAYPAL_PLAN_ID_STUD || '',
            FUTURE_LISTING: process.env.PAYPAL_PLAN_ID_FUTURE || '',
            OTHER_SERVICES: process.env.PAYPAL_PLAN_ID_OTHER_SERVICES || '',
            FEATURED_ADDON: process.env.PAYPAL_PLAN_ID_FEATURED || '',
            PUPPY_LITTER_WITH_FEATURED: process.env.PAYPAL_PLAN_ID_PUPPY_LITTER_WITH_FEATURED || '',
            PUPPY_LITTER_WITHOUT_FEATURED: process.env.PAYPAL_PLAN_ID_PUPPY_LITTER_WITHOUT_FEATURED || '',
        };
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
            this.stripe = new stripe_1.default(stripeSecretKey);
        }
        else {
            console.warn('STRIPE_SECRET_KEY not found in environment variables');
        }
        const paypalClientId = this.configService.get('PAYPAL_CLIENT_ID');
        const paypalClientSecret = this.configService.get('PAYPAL_SECRET');
        const paypalEnvironment = this.configService.get('PAYPAL_ENVIRONMENT') || 'sandbox';
        if (paypalClientId && paypalClientSecret) {
            const environment = paypalEnvironment === 'production'
                ? new paypal.core.LiveEnvironment(paypalClientId, paypalClientSecret)
                : new paypal.core.SandboxEnvironment(paypalClientId, paypalClientSecret);
            this.paypalClient = new paypal.core.PayPalHttpClient(environment);
        }
        else {
            console.warn('PayPal credentials not found in environment variables');
        }
    }
    getSubscriptionPricing(listingType) {
        const pricing = {
            SEMEN_LISTING: 19,
            STUD_LISTING: 39,
            FUTURE_LISTING: 19,
            OTHER_SERVICES: 19,
            FEATURED_ADDON: 79,
        };
        return {
            amount: pricing[listingType] || 0,
            currency: config_2.config.defaultPaymentCurrency,
        };
    }
    async createStripeSubscription(userId, listingType, paymentMethodId, listingId, includesFeatured = false) {
        console.log('🔔 [Subscription] Starting Stripe subscription creation:', {
            userId,
            listingType,
            paymentMethodId,
            listingId,
            includesFeatured,
        });
        this.paymentLogsService.log({
            eventType: payment_logs_service_1.PaymentLogEventType.SUBSCRIPTION_CREATED,
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
            throw new common_1.InternalServerErrorException(error);
        }
        try {
            const isOneTimePaymentType = ['PUPPY_LISTING'].includes(listingType);
            let pricing;
            if (listingType === 'PUPPY_LITTER_LISTING') {
                pricing = includesFeatured
                    ? { amount: 128.00, currency: config_2.config.defaultPaymentCurrency.toLowerCase() }
                    : { amount: 49.00, currency: config_2.config.defaultPaymentCurrency.toLowerCase() };
            }
            else if (isOneTimePaymentType && includesFeatured) {
                pricing = this.getSubscriptionPricing('FEATURED_ADDON');
            }
            else {
                pricing = this.getSubscriptionPricing(listingType);
            }
            console.log('🔔 [Subscription] Pricing determined:', {
                isOneTimePaymentType,
                includesFeatured,
                pricing,
                listingType,
            });
            let customerId;
            const existingSubscription = await this.subscriptionRepository.findOne({
                where: { userId, paymentMethod: subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE },
            });
            if (existingSubscription?.metadata?.customerId) {
                customerId = existingSubscription.metadata.customerId;
                console.log('🔔 [Subscription] Using existing customer:', customerId);
            }
            else {
                console.log('🔔 [Subscription] Creating new Stripe customer for user:', userId);
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
                }
                catch (retrieveError) {
                    console.error('❌ [Subscription] Failed to retrieve payment method:', retrieveError.message);
                    throw new common_1.BadRequestException('Payment method not found. Please use a different payment method.');
                }
                if (paymentMethod.customer && paymentMethod.customer === customerId) {
                    console.log('✅ [Subscription] Payment method already attached to customer');
                }
                else if (paymentMethod.customer && paymentMethod.customer !== customerId) {
                    console.warn('⚠️ [Subscription] Payment method attached to different customer');
                    throw new common_1.BadRequestException('This payment method belongs to a different account. Please use a different payment method.');
                }
                else {
                    try {
                        console.log('🔔 [Subscription] Attaching payment method to customer');
                        await this.stripe.paymentMethods.attach(paymentMethodId, {
                            customer: customerId,
                        });
                        console.log('✅ [Subscription] Payment method attached successfully');
                    }
                    catch (attachError) {
                        if (attachError.code === 'resource_already_exists' ||
                            attachError.message?.includes('previously used') ||
                            attachError.message?.includes('detached from a Customer')) {
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
                            throw new common_1.BadRequestException('This payment method was already used for a one-time payment and cannot be reused for subscriptions. ' +
                                'Please add a new payment method in your account settings or use a different card.');
                        }
                        throw attachError;
                    }
                }
                console.log('🔔 [Subscription] Setting default payment method');
                await this.stripe.customers.update(customerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethodId,
                    },
                });
                console.log('✅ [Subscription] Default payment method set');
            }
            else {
                console.log('🔔 [Subscription] No paymentMethodId provided - Payment Element will collect payment method on frontend');
            }
            const items = [];
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
                    throw new common_1.BadRequestException(error);
                }
                items.push({
                    price: priceId,
                });
                console.log(`🔔 [Subscription] Added PUPPY_LITTER_LISTING subscription (${includesFeatured ? '$128' : '$49'}/month):`, priceId);
            }
            else if (isOneTimePaymentType && includesFeatured) {
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
                    throw new common_1.BadRequestException(error);
                }
                items.push({
                    price: featuredPriceId,
                });
                console.log('🔔 [Subscription] Added featured add-on item:', featuredPriceId);
            }
            else {
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
                    throw new common_1.BadRequestException(error);
                }
                items.push({
                    price: priceId,
                });
                console.log('🔔 [Subscription] Added base subscription item:', priceId);
                if (includesFeatured && this.stripePriceIds.FEATURED_ADDON) {
                    items.push({
                        price: this.stripePriceIds.FEATURED_ADDON,
                    });
                    console.log('🔔 [Subscription] Added featured add-on item:', this.stripePriceIds.FEATURED_ADDON);
                }
            }
            console.log('🔔 [Subscription] Creating Stripe subscription with items:', items);
            const subscriptionParams = {
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
            if (finalPaymentMethodId) {
                subscriptionParams.default_payment_method = finalPaymentMethodId;
            }
            const subscription = await this.stripe.subscriptions.create(subscriptionParams);
            console.log('✅ [Subscription] Stripe subscription created:', subscription.id);
            let totalAmount = pricing.amount;
            if (listingType === 'PUPPY_LITTER_LISTING') {
                totalAmount = includesFeatured ? 128.00 : 49.00;
            }
            else if (isOneTimePaymentType && includesFeatured) {
                totalAmount = this.getSubscriptionPricing('FEATURED_ADDON').amount;
            }
            else if (!isOneTimePaymentType && includesFeatured) {
                totalAmount += this.getSubscriptionPricing('FEATURED_ADDON').amount;
            }
            console.log('🔔 [Subscription] Saving subscription to database:', {
                userId,
                listingId,
                subscriptionId: subscription.id,
                totalAmount,
                status: subscription.status,
            });
            const subscriptionEntity = this.subscriptionRepository.create({
                userId,
                listingId: listingId || null,
                subscriptionId: subscription.id,
                paymentMethod: subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE,
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
            const invoice = subscription.latest_invoice;
            if (invoice && invoice.status === 'paid' && invoice.payment_intent) {
                try {
                    const paymentIntentId = typeof invoice.payment_intent === 'string'
                        ? invoice.payment_intent
                        : invoice.payment_intent.id;
                    const charge = invoice.charge;
                    const existingPayment = await this.paymentRepository.findOne({
                        where: { paymentIntentId },
                    });
                    if (!existingPayment) {
                        const payment = this.paymentRepository.create({
                            userId,
                            listingId: listingId || null,
                            paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                            status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
                            amount: totalAmount,
                            currency: pricing.currency,
                            paymentIntentId: paymentIntentId,
                            paymentMethodId: charge?.payment_method || finalPaymentMethodId || null,
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
                    }
                    else {
                        if (existingPayment.status === payment_entity_1.PaymentStatusEnum.PENDING) {
                            existingPayment.status = payment_entity_1.PaymentStatusEnum.SUCCEEDED;
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
                }
                catch (paymentError) {
                    console.error('❌ [Subscription] Error creating payment record:', paymentError);
                }
            }
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
            const paymentIntent = invoice?.payment_intent;
            const clientSecret = paymentIntent?.client_secret;
            return {
                subscriptionId: savedSubscription.id,
                clientSecret,
            };
        }
        catch (error) {
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
            throw new common_1.BadRequestException(error.message || 'Failed to create Stripe subscription');
        }
    }
    async createPayPalSubscription(userId, listingType, listingId, includesFeatured = false) {
        console.log('🔔 [Subscription] Starting PayPal subscription creation:', {
            userId,
            listingType,
            listingId,
            includesFeatured,
        });
        this.paymentLogsService.log({
            eventType: payment_logs_service_1.PaymentLogEventType.SUBSCRIPTION_CREATED,
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
            throw new common_1.InternalServerErrorException(error);
        }
        try {
            const isOneTimePaymentType = ['PUPPY_LISTING'].includes(listingType);
            let pricing;
            if (listingType === 'PUPPY_LITTER_LISTING') {
                pricing = includesFeatured
                    ? { amount: 128.00, currency: config_2.config.defaultPaymentCurrency.toLowerCase() }
                    : { amount: 49.00, currency: config_2.config.defaultPaymentCurrency.toLowerCase() };
            }
            else if (isOneTimePaymentType && includesFeatured) {
                pricing = this.getSubscriptionPricing('FEATURED_ADDON');
            }
            else {
                pricing = this.getSubscriptionPricing(listingType);
            }
            console.log('🔔 [Subscription] Pricing determined:', {
                isOneTimePaymentType,
                includesFeatured,
                pricing,
                listingType,
            });
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
                throw new common_1.BadRequestException(error);
            }
            console.log('🔔 [Subscription] Using PayPal plan ID:', planId);
            const accessToken = await this.getPayPalAccessToken();
            const subscriptionData = {
                plan_id: planId,
                start_time: new Date(Date.now() + 60000).toISOString(),
                subscriber: {
                    payer_id: userId,
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
            const paypalSubscription = await this.paypalApiRequest(accessToken, 'POST', '/v1/billing/subscriptions', subscriptionData);
            console.log('✅ [Subscription] PayPal subscription created:', paypalSubscription.id);
            const approvalLink = paypalSubscription.links?.find((link) => link.rel === 'approve');
            const approvalUrl = approvalLink?.href || '';
            let totalAmount = pricing.amount;
            if (listingType === 'PUPPY_LITTER_LISTING') {
                totalAmount = includesFeatured ? 128.00 : 49.00;
            }
            else if (isOneTimePaymentType && includesFeatured) {
                totalAmount = this.getSubscriptionPricing('FEATURED_ADDON').amount;
            }
            else if (!isOneTimePaymentType && includesFeatured) {
                totalAmount += this.getSubscriptionPricing('FEATURED_ADDON').amount;
            }
            console.log('🔔 [Subscription] Saving PayPal subscription to database:', {
                userId,
                listingId,
                subscriptionId: paypalSubscription.id,
                totalAmount,
            });
            const subscriptionEntity = this.subscriptionRepository.create({
                userId,
                listingId: listingId || null,
                subscriptionId: paypalSubscription.id,
                paymentMethod: subscription_entity_1.SubscriptionPaymentMethodEnum.PAYPAL,
                status: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
                    approvalUrl: paypalSubscription.links?.find((link) => link.rel === 'approve')?.href,
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
        }
        catch (error) {
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
            throw new common_1.BadRequestException(error.message || 'Failed to create PayPal subscription');
        }
    }
    async getUserSubscriptions(userId, syncFromStripe = false) {
        if (syncFromStripe && this.stripe) {
            await this.syncSubscriptionsFromStripe(userId);
        }
        return this.subscriptionRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async hasActiveSubscriptionForListingType(userId, listingType) {
        const activeStatuses = [
            subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            subscription_entity_1.SubscriptionStatusEnum.TRIALING,
        ];
        const subscription = await this.subscriptionRepository.findOne({
            where: {
                userId,
                listingType,
                status: (0, typeorm_2.In)(activeStatuses),
            },
        });
        if (subscription) {
            const now = new Date();
            if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
                return { hasSubscription: true, subscription };
            }
        }
        return { hasSubscription: false };
    }
    async syncSubscriptionsFromStripe(userId) {
        if (!this.stripe) {
            throw new common_1.InternalServerErrorException('Stripe is not configured');
        }
        try {
            const existingSubscriptions = await this.subscriptionRepository.find({
                where: { userId, paymentMethod: subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE },
            });
            const customerIds = new Set();
            existingSubscriptions.forEach((sub) => {
                if (sub.metadata?.customerId) {
                    customerIds.add(sub.metadata.customerId);
                }
            });
            if (customerIds.size === 0) {
                const stripeSubscriptions = await this.stripe.subscriptions.list({
                    limit: 100,
                    expand: ['data.customer', 'data.items.data.price'],
                });
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
            for (const customerId of customerIds) {
                const stripeSubscriptions = await this.stripe.subscriptions.list({
                    customer: customerId,
                    limit: 100,
                    expand: ['data.customer', 'data.items.data.price'],
                });
                for (const stripeSub of stripeSubscriptions.data) {
                    const existingSub = await this.subscriptionRepository.findOne({
                        where: { subscriptionId: stripeSub.id },
                    });
                    if (existingSub) {
                        existingSub.status = this.mapStripeStatusToSubscriptionStatus(stripeSub.status);
                        existingSub.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
                        existingSub.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
                        existingSub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
                        existingSub.canceledAt = stripeSub.canceled_at
                            ? new Date(stripeSub.canceled_at * 1000)
                            : null;
                        const totalAmount = stripeSub.items.data.reduce((sum, item) => {
                            return sum + (item.price.unit_amount || 0);
                        }, 0);
                        existingSub.amount = totalAmount / 100;
                        existingSub.metadata = {
                            ...existingSub.metadata,
                            stripeSubscription: stripeSub,
                            customerId,
                        };
                        await this.subscriptionRepository.save(existingSub);
                        const mappedStatus = this.mapStripeStatusToSubscriptionStatus(stripeSub.status);
                        const inactiveStatuses = [
                            subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
                            subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
                            subscription_entity_1.SubscriptionStatusEnum.UNPAID,
                            subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
                        ];
                        if (existingSub.listingId && (inactiveStatuses.includes(mappedStatus) || stripeSub.status === 'canceled')) {
                            try {
                                await this.listingRepository
                                    .createQueryBuilder()
                                    .update(listing_entity_1.Listing)
                                    .set({
                                    isActive: false,
                                    status: listing_entity_1.ListingStatusEnum.EXPIRED,
                                })
                                    .where('id = :listingId', { listingId: existingSub.listingId })
                                    .execute();
                                console.log(`[Sync] Deactivated listing ${existingSub.listingId} due to canceled subscription ${stripeSub.id}`);
                            }
                            catch (error) {
                                console.error(`[Sync] Failed to deactivate listing ${existingSub.listingId}:`, error);
                            }
                        }
                        else if (existingSub.listingId && mappedStatus === subscription_entity_1.SubscriptionStatusEnum.ACTIVE) {
                            try {
                                await this.listingRepository
                                    .createQueryBuilder()
                                    .update(listing_entity_1.Listing)
                                    .set({
                                    expiresAt: new Date(stripeSub.current_period_end * 1000),
                                })
                                    .where('id = :listingId', { listingId: existingSub.listingId })
                                    .execute();
                                console.log(`⏳ [Sync] Updated listing expiration, keeping in PENDING_REVIEW for admin approval: ${existingSub.listingId}`);
                            }
                            catch (error) {
                                console.error(`[Sync] Failed to update listing ${existingSub.listingId}:`, error);
                            }
                        }
                    }
                    else {
                        if (stripeSub.metadata?.userId === userId) {
                            const totalAmount = stripeSub.items.data.reduce((sum, item) => {
                                return sum + (item.price.unit_amount || 0);
                            }, 0);
                            let listingType = null;
                            let includesFeatured = false;
                            for (const item of stripeSub.items.data) {
                                const priceId = item.price.id;
                                if (priceId === this.stripePriceIds.FEATURED_ADDON) {
                                    includesFeatured = true;
                                }
                                else {
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
                                paymentMethod: subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE,
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
        }
        catch (error) {
            console.error('Error syncing subscriptions from Stripe:', error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to sync subscriptions from Stripe');
        }
    }
    async getSubscriptionById(subscriptionId, userId) {
        const where = { id: subscriptionId };
        if (userId) {
            where.userId = userId;
        }
        const subscription = await this.subscriptionRepository.findOne({ where });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        return subscription;
    }
    async cancelSubscription(subscriptionId, userId, cancelAtPeriodEnd = true) {
        const subscription = await this.getSubscriptionById(subscriptionId, userId);
        try {
            if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE) {
                if (!this.stripe) {
                    throw new common_1.InternalServerErrorException('Stripe is not configured');
                }
                let stripeSubscription;
                if (cancelAtPeriodEnd) {
                    stripeSubscription = await this.stripe.subscriptions.update(subscription.subscriptionId, {
                        cancel_at_period_end: true,
                    });
                    subscription.cancelAtPeriodEnd = true;
                    subscription.canceledAt = null;
                }
                else {
                    stripeSubscription = await this.stripe.subscriptions.cancel(subscription.subscriptionId);
                    subscription.cancelAtPeriodEnd = false;
                    subscription.canceledAt = new Date();
                }
                subscription.status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);
                subscription.metadata = {
                    ...subscription.metadata,
                    stripeSubscription,
                };
            }
            else if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.PAYPAL) {
                if (!this.paypalClient) {
                    throw new common_1.InternalServerErrorException('PayPal is not configured');
                }
                if (!paypal.subscriptions || !paypal.subscriptions.SubscriptionsCancelRequest) {
                    const cancelUrl = `https://api${this.configService.get('PAYPAL_ENVIRONMENT') === 'production' ? '' : '.sandbox'}.paypal.com/v1/billing/subscriptions/${subscription.subscriptionId}/cancel`;
                    const https = require('https');
                    const auth = Buffer.from(`${this.configService.get('PAYPAL_CLIENT_ID')}:${this.configService.get('PAYPAL_SECRET')}`).toString('base64');
                    await new Promise((resolve, reject) => {
                        const postData = JSON.stringify({
                            reason: cancelAtPeriodEnd ? 'User requested cancellation at period end' : 'User requested immediate cancellation',
                        });
                        const options = {
                            hostname: cancelUrl.includes('sandbox') ? 'api.sandbox.paypal.com' : 'api.paypal.com',
                            path: `/v1/billing/subscriptions/${subscription.subscriptionId}/cancel`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Basic ${auth}`,
                                'Content-Length': Buffer.byteLength(postData),
                            },
                        };
                        const req = https.request(options, (res) => {
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                resolve(res);
                            }
                            else {
                                reject(new Error(`PayPal API error: ${res.statusCode}`));
                            }
                        });
                        req.on('error', reject);
                        req.write(postData);
                        req.end();
                    });
                }
                else {
                    const request = new paypal.subscriptions.SubscriptionsCancelRequest(subscription.subscriptionId);
                    request.requestBody({
                        reason: cancelAtPeriodEnd ? 'User requested cancellation at period end' : 'User requested immediate cancellation',
                    });
                    await this.paypalClient.execute(request);
                }
                subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
                subscription.canceledAt = cancelAtPeriodEnd ? null : new Date();
                subscription.status = cancelAtPeriodEnd
                    ? subscription_entity_1.SubscriptionStatusEnum.ACTIVE
                    : subscription_entity_1.SubscriptionStatusEnum.CANCELLED;
            }
            const updatedSubscription = await this.subscriptionRepository.save(subscription);
            this.paymentLogsService.logSubscriptionCancelled({
                userId,
                subscriptionId: updatedSubscription.id,
                listingId: updatedSubscription.listingId,
                cancelAtPeriodEnd,
                provider: subscription.paymentMethod,
                metadata: { originalSubscriptionId: subscription.subscriptionId },
            });
            return updatedSubscription;
        }
        catch (error) {
            this.paymentLogsService.logError({
                userId,
                subscriptionId: subscription.id,
                provider: subscription.paymentMethod,
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                context: { cancelAtPeriodEnd },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to cancel subscription');
        }
    }
    async updateSubscription(subscriptionId, userId, includesFeatured) {
        const subscription = await this.getSubscriptionById(subscriptionId, userId);
        if (subscription.includesFeatured === includesFeatured) {
            return subscription;
        }
        try {
            if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE) {
                if (!this.stripe) {
                    throw new common_1.InternalServerErrorException('Stripe is not configured');
                }
                const featuredPriceId = this.stripePriceIds.FEATURED_ADDON;
                if (!featuredPriceId) {
                    throw new common_1.BadRequestException('Featured add-on price ID not configured');
                }
                const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.subscriptionId);
                if (includesFeatured) {
                    await this.stripe.subscriptionItems.create({
                        subscription: subscription.subscriptionId,
                        price: featuredPriceId,
                    });
                }
                else {
                    const featuredItem = stripeSubscription.items.data.find((item) => item.price.id === featuredPriceId);
                    if (featuredItem) {
                        await this.stripe.subscriptionItems.del(featuredItem.id);
                    }
                }
                const updatedStripeSubscription = await this.stripe.subscriptions.retrieve(subscription.subscriptionId);
                subscription.includesFeatured = includesFeatured;
                subscription.amount =
                    this.getSubscriptionPricing(subscription.listingType || '').amount +
                        (includesFeatured ? this.getSubscriptionPricing('FEATURED_ADDON').amount : 0);
                subscription.metadata = {
                    ...subscription.metadata,
                    stripeSubscription: updatedStripeSubscription,
                };
            }
            else if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.PAYPAL) {
                throw new common_1.BadRequestException('PayPal subscription updates are not yet supported. Please cancel and create a new subscription.');
            }
            const updatedSubscription = await this.subscriptionRepository.save(subscription);
            this.paymentLogsService.logSubscriptionUpdated({
                userId,
                subscriptionId: updatedSubscription.id,
                listingId: updatedSubscription.listingId,
                provider: subscription.paymentMethod,
                changes: { includesFeatured },
                metadata: { originalSubscriptionId: subscription.subscriptionId },
            });
            return updatedSubscription;
        }
        catch (error) {
            this.paymentLogsService.logError({
                userId,
                subscriptionId: subscription.id,
                provider: subscription.paymentMethod,
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                context: { includesFeatured },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to update subscription');
        }
    }
    async updatePaymentMethod(subscriptionId, userId, paymentMethodId) {
        const subscription = await this.getSubscriptionById(subscriptionId, userId);
        try {
            if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.STRIPE) {
                if (!this.stripe) {
                    throw new common_1.InternalServerErrorException('Stripe is not configured');
                }
                const customerId = subscription.metadata?.customerId;
                if (!customerId) {
                    throw new common_1.BadRequestException('Customer ID not found in subscription');
                }
                await this.stripe.paymentMethods.attach(paymentMethodId, {
                    customer: customerId,
                });
                await this.stripe.subscriptions.update(subscription.subscriptionId, {
                    default_payment_method: paymentMethodId,
                });
                await this.stripe.customers.update(customerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethodId,
                    },
                });
                subscription.metadata = {
                    ...subscription.metadata,
                    paymentMethodId,
                };
            }
            else if (subscription.paymentMethod === subscription_entity_1.SubscriptionPaymentMethodEnum.PAYPAL) {
                throw new common_1.BadRequestException('PayPal payment method updates require re-approval. Please cancel and create a new subscription.');
            }
            const updatedSubscription = await this.subscriptionRepository.save(subscription);
            this.paymentLogsService.logPaymentMethodUpdated({
                userId,
                subscriptionId: updatedSubscription.id,
                provider: subscription.paymentMethod,
                metadata: { paymentMethodId },
            });
            return updatedSubscription;
        }
        catch (error) {
            this.paymentLogsService.logError({
                userId,
                subscriptionId: subscription.id,
                provider: subscription.paymentMethod,
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                context: { paymentMethodId },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to update payment method');
        }
    }
    async updateSubscriptionStatus(providerSubscriptionId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, metadata) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId: providerSubscriptionId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException(`Subscription not found: ${providerSubscriptionId}`);
        }
        subscription.status = status;
        if (currentPeriodStart)
            subscription.currentPeriodStart = currentPeriodStart;
        if (currentPeriodEnd)
            subscription.currentPeriodEnd = currentPeriodEnd;
        if (cancelAtPeriodEnd !== undefined)
            subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
        if (metadata) {
            subscription.metadata = { ...subscription.metadata, ...metadata };
        }
        return this.subscriptionRepository.save(subscription);
    }
    async handleSubscriptionRenewal(providerSubscriptionId, amount, currency) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId: providerSubscriptionId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException(`Subscription not found: ${providerSubscriptionId}`);
        }
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
    mapStripeStatusToSubscriptionStatus(stripeStatus) {
        const statusMap = {
            active: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            canceled: subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
            incomplete: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE,
            incomplete_expired: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
            past_due: subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
            trialing: subscription_entity_1.SubscriptionStatusEnum.TRIALING,
            unpaid: subscription_entity_1.SubscriptionStatusEnum.UNPAID,
        };
        return statusMap[stripeStatus] || subscription_entity_1.SubscriptionStatusEnum.ACTIVE;
    }
    mapPayPalStatusToSubscriptionStatus(paypalStatus) {
        const statusMap = {
            APPROVAL_PENDING: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE,
            APPROVED: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            ACTIVE: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            SUSPENDED: subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
            CANCELLED: subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
            EXPIRED: subscription_entity_1.SubscriptionStatusEnum.EXPIRED,
        };
        return statusMap[paypalStatus] || subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE;
    }
    async syncPayPalSubscriptionStatus(subscriptionId, userId) {
        const subscription = await this.getSubscriptionById(subscriptionId, userId);
        if (subscription.paymentMethod !== subscription_entity_1.SubscriptionPaymentMethodEnum.PAYPAL) {
            throw new common_1.BadRequestException('Subscription is not a PayPal subscription');
        }
        try {
            const accessToken = await this.getPayPalAccessToken();
            const paypalSubscription = await this.paypalApiRequest(accessToken, 'GET', `/v1/billing/subscriptions/${subscription.subscriptionId}`);
            const paypalStatus = paypalSubscription.status;
            const mappedStatus = this.mapPayPalStatusToSubscriptionStatus(paypalStatus);
            subscription.status = mappedStatus;
            subscription.metadata = {
                ...subscription.metadata,
                paypalSubscription,
            };
            if (paypalSubscription.start_time) {
                subscription.currentPeriodStart = new Date(paypalSubscription.start_time);
            }
            if (paypalSubscription.billing_info?.next_billing_time) {
                subscription.currentPeriodEnd = new Date(paypalSubscription.billing_info.next_billing_time);
            }
            return await this.subscriptionRepository.save(subscription);
        }
        catch (error) {
            this.paymentLogsService.logError({
                userId,
                subscriptionId: subscription.id,
                provider: 'paypal',
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                context: { action: 'syncPayPalSubscriptionStatus' },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to sync PayPal subscription status');
        }
    }
    async getPayPalAccessToken() {
        const clientId = this.configService.get('PAYPAL_CLIENT_ID');
        const clientSecret = this.configService.get('PAYPAL_SECRET');
        const environment = this.configService.get('PAYPAL_ENVIRONMENT') || 'sandbox';
        const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
        if (!clientId || !clientSecret) {
            throw new common_1.InternalServerErrorException('PayPal credentials not configured');
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
                    }
                    else {
                        reject(new Error(`Failed to get PayPal access token: ${res.statusCode} - ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write('grant_type=client_credentials');
            req.end();
        });
    }
    async paypalApiRequest(accessToken, method, path, body) {
        const environment = this.configService.get('PAYPAL_ENVIRONMENT') || 'sandbox';
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
                    }
                    else {
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
    async confirmSubscriptionPayment(subscriptionId, userId) {
        console.log('🔔 [Subscription] Confirming payment for subscription:', { subscriptionId, userId });
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId, userId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException(`Subscription not found: ${subscriptionId}`);
        }
        if (!this.stripe) {
            throw new common_1.InternalServerErrorException('Stripe is not configured');
        }
        try {
            const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.subscriptionId);
            console.log('✅ [Subscription] Retrieved Stripe subscription:', {
                stripeId: stripeSubscription.id,
                status: stripeSubscription.status,
                latestInvoice: stripeSubscription.latest_invoice,
            });
            subscription.status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);
            subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
            subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
            subscription.canceledAt = stripeSubscription.canceled_at
                ? new Date(stripeSubscription.canceled_at * 1000)
                : null;
            subscription.metadata = {
                ...subscription.metadata,
                stripeSubscription,
                lastSyncedAt: new Date().toISOString(),
            };
            const updatedSubscription = await this.subscriptionRepository.save(subscription);
            console.log('✅ [Subscription] Subscription status updated:', {
                databaseId: updatedSubscription.id,
                status: updatedSubscription.status,
                listingId: updatedSubscription.listingId,
            });
            if (updatedSubscription.status === subscription_entity_1.SubscriptionStatusEnum.ACTIVE &&
                updatedSubscription.listingId) {
                console.log('🔔 [Subscription] confirmSubscriptionPayment - Subscription is ACTIVE, checking listing...');
                try {
                    const listing = await this.listingRepository.findOne({
                        where: { id: updatedSubscription.listingId },
                    });
                    if (listing) {
                        console.log('📋 [Subscription] confirmSubscriptionPayment - Listing found - BEFORE UPDATE:', {
                            listingId: listing.id,
                            currentStatus: listing.status,
                            isActive: listing.isActive,
                            expiresAt: listing.expiresAt,
                        });
                        const updateData = {
                            expiresAt: updatedSubscription.currentPeriodEnd,
                        };
                        if (listing.status === listing_entity_1.ListingStatusEnum.DRAFT) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            console.log('⏳ [Subscription] confirmSubscriptionPayment - DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval');
                            console.log('⏳ [Subscription] confirmSubscriptionPayment - Update data:', JSON.stringify(updateData, null, 2));
                        }
                        else if (listing.status === listing_entity_1.ListingStatusEnum.EXPIRED) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            console.log('🔄 [Subscription] confirmSubscriptionPayment - DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval');
                            console.log('🔄 [Subscription] confirmSubscriptionPayment - Update data:', JSON.stringify(updateData, null, 2));
                        }
                        else {
                            console.log('⏳ [Subscription] confirmSubscriptionPayment - DECISION: Updated listing expiration, keeping status as:', listing.status);
                            console.log('⏳ [Subscription] confirmSubscriptionPayment - Update data:', JSON.stringify(updateData, null, 2));
                        }
                        if (Object.keys(updateData).length > 0) {
                            console.log('💾 [Subscription] confirmSubscriptionPayment - Executing database update...');
                            await this.listingRepository
                                .createQueryBuilder()
                                .update(listing_entity_1.Listing)
                                .set(updateData)
                                .where('id = :listingId', { listingId: updatedSubscription.listingId })
                                .execute();
                            const updatedListing = await this.listingRepository.findOne({
                                where: { id: updatedSubscription.listingId },
                            });
                            console.log('✅ [Subscription] confirmSubscriptionPayment - Listing updated - AFTER UPDATE:', {
                                listingId: updatedListing?.id,
                                newStatus: updatedListing?.status,
                                newIsActive: updatedListing?.isActive,
                                newExpiresAt: updatedListing?.expiresAt,
                            });
                        }
                    }
                    else {
                        console.warn('⚠️ [Subscription] confirmSubscriptionPayment - Listing not found:', updatedSubscription.listingId);
                    }
                }
                catch (error) {
                    console.error('❌ [Subscription] confirmSubscriptionPayment - Error updating listing:', error);
                    console.error('❌ [Subscription] confirmSubscriptionPayment - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                }
            }
            else {
                console.log('ℹ️ [Subscription] confirmSubscriptionPayment - Subscription status is not ACTIVE or has no listingId. Status:', updatedSubscription.status, 'ListingId:', updatedSubscription.listingId);
            }
            return updatedSubscription;
        }
        catch (error) {
            console.error('❌ [Subscription] Error confirming subscription payment:', error);
            throw new common_1.InternalServerErrorException(`Failed to confirm subscription payment: ${error.message}`);
        }
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(2, (0, typeorm_1.InjectRepository)(listing_entity_1.Listing)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        payment_logs_service_1.PaymentLogsService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map