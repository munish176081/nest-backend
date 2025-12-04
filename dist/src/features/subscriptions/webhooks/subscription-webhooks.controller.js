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
var SubscriptionWebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionWebhooksController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
const subscriptions_service_1 = require("../subscriptions.service");
const subscription_entity_1 = require("../entities/subscription.entity");
const payment_logs_service_1 = require("../../payments/payment-logs.service");
const listing_entity_1 = require("../../listings/entities/listing.entity");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const listings_service_1 = require("../../listings/listings.service");
let SubscriptionWebhooksController = SubscriptionWebhooksController_1 = class SubscriptionWebhooksController {
    constructor(configService, subscriptionsService, paymentLogsService, listingRepository, paymentRepository, subscriptionRepository, listingsService) {
        this.configService = configService;
        this.subscriptionsService = subscriptionsService;
        this.paymentLogsService = paymentLogsService;
        this.listingRepository = listingRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.listingsService = listingsService;
        this.logger = new common_1.Logger(SubscriptionWebhooksController_1.name);
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
            this.stripe = new stripe_1.default(stripeSecretKey);
        }
    }
    async handleStripeWebhook(req, signature) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        const timestamp = new Date().toISOString();
        this.logger.log(`🔔 [WEBHOOK] Stripe webhook received at ${timestamp}`);
        this.logger.log(`🔔 [WEBHOOK] Signature present: ${!!signature}`);
        if (!webhookSecret) {
            this.logger.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        if (!this.stripe) {
            this.logger.error('❌ [WEBHOOK] Stripe not configured');
            throw new common_1.BadRequestException('Stripe not configured');
        }
        let event;
        try {
            this.logger.log(`🔍 [WEBHOOK] Verifying webhook signature...`);
            event = this.stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
            this.logger.log(`✅ [WEBHOOK] Signature verified successfully`);
        }
        catch (err) {
            this.logger.error(`❌ [WEBHOOK] Signature verification failed: ${err.message}`);
            this.logger.error(`❌ [WEBHOOK] Error details: ${JSON.stringify(err, null, 2)}`);
            this.paymentLogsService.logError({
                provider: 'stripe',
                error: err instanceof Error ? err : new Error(err.message),
                context: { webhookSignature: signature?.substring(0, 20) + '...' },
            });
            throw new common_1.BadRequestException(`Webhook signature verification failed: ${err.message}`);
        }
        this.logger.log(`📥 [WEBHOOK] Event received:`);
        this.logger.log(`   - Type: ${event.type}`);
        this.logger.log(`   - ID: ${event.id}`);
        this.logger.log(`   - Created: ${new Date(event.created * 1000).toISOString()}`);
        this.logger.log(`   - Livemode: ${event.livemode}`);
        if (event.data?.object) {
            const obj = event.data.object;
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
        this.paymentLogsService.logWebhookReceived({
            provider: 'stripe',
            eventType: event.type,
            eventId: event.id,
            requestData: { object: event.data.object },
        });
        try {
            this.logger.log(`🔄 [WEBHOOK] Processing event type: ${event.type}`);
            switch (event.type) {
                case 'customer.subscription.created':
                    this.logger.log(`📝 [WEBHOOK] Handling subscription.created`);
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    this.logger.log(`📝 [WEBHOOK] Handling subscription.updated`);
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    this.logger.log(`📝 [WEBHOOK] Handling subscription.deleted`);
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    this.logger.log(`📝 [WEBHOOK] Handling invoice.payment_succeeded`);
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    this.logger.log(`📝 [WEBHOOK] Handling invoice.payment_failed`);
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    this.logger.warn(`⚠️ [WEBHOOK] Unhandled event type: ${event.type}`);
            }
            this.logger.log(`✅ [WEBHOOK] Event processed successfully: ${event.type}`);
            this.paymentLogsService.logWebhookProcessed({
                provider: 'stripe',
                eventType: event.type,
                eventId: event.id,
                success: true,
                responseData: { processed: true },
            });
            return { received: true, eventType: event.type, eventId: event.id };
        }
        catch (error) {
            this.logger.error(`❌ [WEBHOOK] Error processing webhook: ${error.message}`);
            this.logger.error(`❌ [WEBHOOK] Stack trace: ${error.stack}`);
            this.logger.error(`❌ [WEBHOOK] Event type: ${event.type}, Event ID: ${event.id}`);
            this.paymentLogsService.logWebhookProcessed({
                provider: 'stripe',
                eventType: event.type,
                eventId: event.id,
                success: false,
                error: error instanceof Error ? error : new Error(error.message),
            });
            throw new common_1.BadRequestException(`Webhook processing failed: ${error.message}`);
        }
    }
    async handleSubscriptionCreated(subscription) {
        this.logger.log(`📝 [SUBSCRIPTION_CREATED] Processing subscription: ${subscription.id}`);
        this.logger.log(`   - Status: ${subscription.status}`);
        this.logger.log(`   - Customer: ${subscription.customer}`);
        this.logger.log(`   - Metadata: ${JSON.stringify(subscription.metadata, null, 2)}`);
        const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(subscription.id, this.mapStripeStatus(subscription.status), new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), subscription.cancel_at_period_end, { stripeSubscription: subscription });
        this.logger.log(`✅ [SUBSCRIPTION_CREATED] Subscription updated in database: ${subscriptionEntity.id}`);
        this.logger.log(`   - Database ID: ${subscriptionEntity.id}`);
        this.logger.log(`   - Listing ID: ${subscriptionEntity.listingId || 'null'}`);
        if (subscriptionEntity.listingId) {
            this.logger.log(`📅 [SUBSCRIPTION_CREATED] Updating listing expiration: ${subscriptionEntity.listingId}`);
            await this.updateListingExpiration(subscriptionEntity.listingId, new Date(subscription.current_period_end * 1000));
            this.logger.log(`✅ [SUBSCRIPTION_CREATED] Listing expiration updated`);
        }
        else {
            this.logger.log(`ℹ️ [SUBSCRIPTION_CREATED] Subscription not linked to listing yet`);
        }
    }
    async handleSubscriptionUpdated(subscription) {
        this.logger.log(`📝 [SUBSCRIPTION_UPDATED] Processing subscription: ${subscription.id}`);
        this.logger.log(`   - Status: ${subscription.status}`);
        this.logger.log(`   - Cancel at period end: ${subscription.cancel_at_period_end}`);
        this.logger.log(`   - Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(subscription.id, this.mapStripeStatus(subscription.status), new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), subscription.cancel_at_period_end, { stripeSubscription: subscription });
        this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Subscription updated in database: ${subscriptionEntity.id}`);
        this.logger.log(`   - Database ID: ${subscriptionEntity.id}`);
        this.logger.log(`   - Listing ID: ${subscriptionEntity.listingId || 'null'}`);
        this.logger.log(`   - Mapped Status: ${this.mapStripeStatus(subscription.status)}`);
        if (subscriptionEntity.listingId) {
            const mappedStatus = this.mapStripeStatus(subscription.status);
            const inactiveStatuses = [
                subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
                subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
                subscription_entity_1.SubscriptionStatusEnum.UNPAID,
                subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
            ];
            if (inactiveStatuses.includes(mappedStatus) || subscription.status === 'canceled') {
                this.logger.log(`🔄 [SUBSCRIPTION_UPDATED] Deactivating listing due to inactive subscription status`);
                try {
                    await this.listingRepository
                        .createQueryBuilder()
                        .update(listing_entity_1.Listing)
                        .set({
                        isActive: false,
                        status: listing_entity_1.ListingStatusEnum.EXPIRED,
                    })
                        .where('id = :listingId', { listingId: subscriptionEntity.listingId })
                        .execute();
                    this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Deactivated listing ${subscriptionEntity.listingId} due to subscription cancellation. Status: ${mappedStatus}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);
                }
                catch (error) {
                    this.logger.error(`❌ [SUBSCRIPTION_UPDATED] Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
                }
            }
            else if (mappedStatus === subscription_entity_1.SubscriptionStatusEnum.ACTIVE) {
                this.logger.log(`📅 [SUBSCRIPTION_UPDATED] Updating listing expiration date`);
                await this.updateListingExpiration(subscriptionEntity.listingId, new Date(subscription.current_period_end * 1000));
                this.logger.log(`✅ [SUBSCRIPTION_UPDATED] Listing expiration updated`);
            }
        }
        else {
            this.logger.log(`ℹ️ [SUBSCRIPTION_UPDATED] Subscription not linked to listing`);
        }
    }
    async handleSubscriptionDeleted(subscription) {
        const subscriptionEntity = await this.subscriptionRepository.findOne({
            where: { subscriptionId: subscription.id },
        });
        await this.subscriptionsService.updateSubscriptionStatus(subscription.id, subscription_entity_1.SubscriptionStatusEnum.CANCELLED, new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), false, { stripeSubscription: subscription, deletedAt: new Date().toISOString() });
        if (subscriptionEntity?.listingId) {
            try {
                await this.listingRepository
                    .createQueryBuilder()
                    .update(listing_entity_1.Listing)
                    .set({
                    isActive: false,
                    status: listing_entity_1.ListingStatusEnum.EXPIRED,
                })
                    .where('id = :listingId', { listingId: subscriptionEntity.listingId })
                    .execute();
                this.logger.log(`Deactivated listing ${subscriptionEntity.listingId} due to subscription cancellation`);
            }
            catch (error) {
                this.logger.error(`Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
            }
        }
    }
    async handlePaymentSucceeded(invoice) {
        this.logger.log(`💳 [PAYMENT_SUCCEEDED] Processing invoice: ${invoice.id}`);
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] No subscription ID in invoice: ${invoice.id}`);
            return;
        }
        this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Looking for subscription with Stripe ID: ${subscriptionId}`);
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
        this.logger.log(`🔄 [PAYMENT_SUCCEEDED] Updating subscription status to ACTIVE`);
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, undefined, undefined, undefined, { lastPaymentSucceeded: new Date().toISOString() });
        this.logger.log(`✅ [PAYMENT_SUCCEEDED] Subscription status updated to ACTIVE`);
        if (!subscription.listingId) {
            this.logger.log(`🔗 [PAYMENT_SUCCEEDED] Subscription not linked to listing, attempting to link...`);
            try {
                this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Retrieving Stripe subscription to check metadata`);
                const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
                const listingIdFromMetadata = stripeSubscription.metadata?.listingId;
                this.logger.log(`📋 [PAYMENT_SUCCEEDED] Stripe subscription metadata: ${JSON.stringify(stripeSubscription.metadata, null, 2)}`);
                this.logger.log(`📋 [PAYMENT_SUCCEEDED] Listing ID from metadata: ${listingIdFromMetadata || 'null'}`);
                if (listingIdFromMetadata) {
                    this.logger.log(`🔍 [PAYMENT_SUCCEEDED] Looking for listing: ${listingIdFromMetadata}`);
                    const listing = await this.listingRepository.findOne({
                        where: { id: listingIdFromMetadata, userId: subscription.userId },
                    });
                    if (listing) {
                        this.logger.log(`✅ [PAYMENT_SUCCEEDED] Found listing, linking subscription to listing`);
                        subscription.listingId = listingIdFromMetadata;
                        await this.subscriptionRepository.save(subscription);
                        this.logger.log(`✅ [PAYMENT_SUCCEEDED] Linked subscription ${subscriptionId} to listing ${listingIdFromMetadata}`);
                        if (!listing.subscriptionId) {
                            await this.listingRepository.update(listingIdFromMetadata, { subscriptionId: subscription.id });
                            this.logger.log(`✅ [PAYMENT_SUCCEEDED] Updated listing's subscriptionId to ${subscription.id}`);
                        }
                        const expirationDate = new Date(stripeSubscription.current_period_end * 1000);
                        this.logger.log(`📅 [PAYMENT_SUCCEEDED] Updating listing expiration to: ${expirationDate.toISOString()}`);
                        await this.updateListingExpiration(listingIdFromMetadata, expirationDate);
                        this.logger.log(`⏳ [PAYMENT_SUCCEEDED] Listing ${listingIdFromMetadata} remains in ${listing.status} status, awaiting admin approval`);
                    }
                    else {
                        this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] Listing not found or doesn't belong to user: ${listingIdFromMetadata}`);
                    }
                }
                else {
                    this.logger.warn(`⚠️ [PAYMENT_SUCCEEDED] No listingId in Stripe subscription metadata`);
                }
            }
            catch (error) {
                this.logger.error(`❌ [PAYMENT_SUCCEEDED] Error linking subscription to listing:`, error);
                this.logger.error(`❌ [PAYMENT_SUCCEEDED] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            }
        }
        else {
            this.logger.log(`ℹ️ [PAYMENT_SUCCEEDED] Subscription already linked to listing: ${subscription.listingId}`);
        }
        const paymentIntentId = invoice.payment_intent;
        const charge = invoice.charge;
        try {
            const existingPayment = paymentIntentId
                ? await this.paymentRepository.findOne({
                    where: { paymentIntentId },
                })
                : null;
            if (!existingPayment) {
                const payment = this.paymentRepository.create({
                    userId: subscription.userId,
                    listingId: subscription.listingId,
                    paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                    status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
                    amount: invoice.amount_paid / 100,
                    currency: invoice.currency.toUpperCase(),
                    paymentIntentId: paymentIntentId || null,
                    paymentMethodId: charge?.payment_method || null,
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
            }
            else {
                if (existingPayment.status === payment_entity_1.PaymentStatusEnum.PENDING) {
                    existingPayment.status = payment_entity_1.PaymentStatusEnum.SUCCEEDED;
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
        }
        catch (error) {
            this.logger.error(`Error creating payment record for invoice ${invoice.id}:`, error);
        }
        if (invoice.billing_reason === 'subscription_cycle') {
            await this.subscriptionsService.handleSubscriptionRenewal(subscriptionId, invoice.amount_paid / 100, invoice.currency.toUpperCase());
            if (subscription.listingId) {
                const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
                await this.updateListingExpiration(subscription.listingId, new Date(stripeSubscription.current_period_end * 1000));
            }
        }
    }
    async handlePaymentFailed(invoice) {
        this.logger.log(`💳 [PAYMENT_FAILED] Processing invoice: ${invoice.id}`);
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            this.logger.warn(`⚠️ [PAYMENT_FAILED] No subscription ID in invoice: ${invoice.id}`);
            return;
        }
        this.logger.log(`🔍 [PAYMENT_FAILED] Looking for subscription with Stripe ID: ${subscriptionId}`);
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
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.PAST_DUE, undefined, undefined, undefined, { lastPaymentFailed: new Date().toISOString(), invoiceId: invoice.id });
        this.logger.log(`✅ [PAYMENT_FAILED] Subscription status updated to PAST_DUE`);
        if (subscription?.listingId) {
            this.logger.log(`🔄 [PAYMENT_FAILED] Deactivating listing: ${subscription.listingId}`);
            try {
                await this.listingRepository
                    .createQueryBuilder()
                    .update(listing_entity_1.Listing)
                    .set({
                    isActive: false,
                    status: listing_entity_1.ListingStatusEnum.EXPIRED,
                })
                    .where('id = :listingId', { listingId: subscription.listingId })
                    .execute();
                this.logger.log(`✅ [PAYMENT_FAILED] Deactivated listing ${subscription.listingId} due to payment failure`);
            }
            catch (error) {
                this.logger.error(`❌ [PAYMENT_FAILED] Failed to deactivate listing ${subscription.listingId}:`, error);
            }
        }
        else {
            this.logger.log(`ℹ️ [PAYMENT_FAILED] Subscription not linked to listing, skipping deactivation`);
        }
    }
    mapStripeStatus(status) {
        const statusMap = {
            active: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            canceled: subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
            incomplete: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE,
            incomplete_expired: subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
            past_due: subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
            trialing: subscription_entity_1.SubscriptionStatusEnum.TRIALING,
            unpaid: subscription_entity_1.SubscriptionStatusEnum.UNPAID,
        };
        return statusMap[status] || subscription_entity_1.SubscriptionStatusEnum.ACTIVE;
    }
    async verifyPayPalWebhook(headers, body, webhookId) {
        const https = require('https');
        const environment = this.configService.get('PAYPAL_ENVIRONMENT') || 'sandbox';
        const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
        const clientId = this.configService.get('PAYPAL_CLIENT_ID');
        const clientSecret = this.configService.get('PAYPAL_SECRET');
        if (!clientId || !clientSecret) {
            throw new common_1.BadRequestException('PayPal credentials not configured');
        }
        const accessToken = await this.getPayPalAccessToken();
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
            throw new common_1.BadRequestException(`Missing required webhook headers: ${missingHeaders.join(', ')}`);
        }
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
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk.toString();
                });
                res.on('end', () => {
                    try {
                        this.logger.debug(`📥 PayPal verification response status: ${res.statusCode}`);
                        this.logger.debug(`📥 PayPal verification response body: ${data.substring(0, 500)}`);
                        if (res.statusCode !== 200) {
                            const errorMsg = `PayPal API returned status ${res.statusCode}: ${data}`;
                            this.logger.error(`❌ ${errorMsg}`);
                            reject(new common_1.BadRequestException(errorMsg));
                            return;
                        }
                        const response = JSON.parse(data);
                        if (response.verification_status === 'SUCCESS') {
                            this.logger.debug('✅ PayPal webhook signature verified successfully');
                            resolve();
                        }
                        else {
                            const status = response.verification_status || 'UNKNOWN';
                            const errorDetails = response.error_details || response.message || 'No details';
                            this.logger.error(`❌ PayPal webhook verification failed: ${status}`, {
                                verification_status: status,
                                error_details: errorDetails,
                                full_response: response,
                            });
                            reject(new common_1.BadRequestException(`Webhook verification failed: ${status} - ${errorDetails}`));
                        }
                    }
                    catch (error) {
                        const errorMsg = error?.message || error?.toString() || 'Unknown parsing error';
                        this.logger.error(`❌ Error parsing PayPal verification response: ${errorMsg}`, {
                            raw_response: data,
                            error: error,
                        });
                        reject(new common_1.BadRequestException(`Webhook verification failed: ${errorMsg}`));
                    }
                });
            });
            req.on('error', (error) => {
                const errorMsg = error?.message || error?.toString() || 'Unknown network error';
                this.logger.error(`❌ Error verifying PayPal webhook: ${errorMsg}`, {
                    error: error,
                    stack: error?.stack,
                });
                reject(new common_1.BadRequestException(`Webhook verification failed: ${errorMsg}`));
            });
            req.write(postData);
            req.end();
        });
    }
    async getPayPalAccessToken() {
        const https = require('https');
        const environment = this.configService.get('PAYPAL_ENVIRONMENT') || 'sandbox';
        const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
        const clientId = this.configService.get('PAYPAL_CLIENT_ID');
        const clientSecret = this.configService.get('PAYPAL_SECRET');
        if (!clientId || !clientSecret) {
            throw new common_1.BadRequestException('PayPal credentials not configured');
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
                res.on('data', (chunk) => {
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
                        }
                        else {
                            const errorMsg = response.error_description || response.error || 'Unknown error';
                            this.logger.error(`❌ Failed to get PayPal access token: ${errorMsg}`, {
                                response: response,
                            });
                            reject(new Error(`Failed to get PayPal access token: ${errorMsg}`));
                        }
                    }
                    catch (error) {
                        const errorMsg = error?.message || error?.toString() || 'Unknown parsing error';
                        this.logger.error(`❌ Error parsing PayPal token response: ${errorMsg}`, {
                            raw_response: data,
                            error: error,
                        });
                        reject(new Error(`Error parsing PayPal token response: ${errorMsg}`));
                    }
                });
            });
            req.on('error', (error) => {
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
    async updateListingExpiration(listingId, expiresAt) {
        try {
            this.logger.log(`📅 [UPDATE_EXPIRATION] Updating listing ${listingId} expiration to ${expiresAt.toISOString()}`);
            const listing = await this.listingRepository.findOne({
                where: { id: listingId },
            });
            const updateData = { expiresAt };
            if (listing && listing.status === listing_entity_1.ListingStatusEnum.EXPIRED) {
                updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                updateData.isActive = false;
                this.logger.log(`🔄 [UPDATE_EXPIRATION] Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
            }
            await this.listingRepository
                .createQueryBuilder()
                .update(listing_entity_1.Listing)
                .set(updateData)
                .where('id = :listingId', { listingId })
                .execute();
            this.logger.log(`✅ [UPDATE_EXPIRATION] Listing expiration updated successfully`);
        }
        catch (error) {
            this.logger.error(`❌ [UPDATE_EXPIRATION] Failed to update listing expiration: ${error}`);
            this.logger.error(`❌ [UPDATE_EXPIRATION] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        }
    }
    async testWebhookEndpoint() {
        this.logger.log(`🧪 [TEST] Webhook test endpoint called`);
        const siteUrl = this.configService.get('siteUrl') || 'http://localhost:3000';
        const webhookUrl = `${siteUrl}/api/v1/webhooks/stripe/subscriptions`;
        return {
            status: 'ok',
            message: 'Webhook endpoint is accessible',
            timestamp: new Date().toISOString(),
            webhookSecretConfigured: !!this.configService.get('STRIPE_WEBHOOK_SECRET'),
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
    async handlePayPalWebhook(req, headers) {
        const webhookId = this.configService.get('PAYPAL_WEBHOOK_ID');
        if (!webhookId) {
            this.logger.error('PAYPAL_WEBHOOK_ID not configured');
            throw new common_1.BadRequestException('Webhook ID not configured');
        }
        const paypalClient = this.subscriptionsService.paypalClient;
        if (!paypalClient) {
            throw new common_1.BadRequestException('PayPal not configured');
        }
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
        const skipVerification = this.configService.get('SKIP_PAYPAL_WEBHOOK_VERIFICATION') === 'true';
        const nodeEnv = this.configService.get('NODE_ENV') || 'development';
        if (skipVerification || nodeEnv === 'development') {
            this.logger.warn('⚠️ [DEV MODE] Skipping PayPal webhook verification');
        }
        else {
            try {
                const normalizedHeaders = {};
                Object.keys(headers).forEach(key => {
                    const lowerKey = key.toLowerCase();
                    normalizedHeaders[lowerKey] = headers[key];
                });
                await this.verifyPayPalWebhook(normalizedHeaders, req.body, webhookId);
            }
            catch (err) {
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
                throw new common_1.BadRequestException(`Webhook verification failed: ${errorMsg}`);
            }
        }
        const event = req.body;
        const eventType = event.event_type;
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
            this.paymentLogsService.logWebhookProcessed({
                provider: 'paypal',
                eventType,
                eventId: event.id,
                success: true,
                responseData: { processed: true },
            });
            return { received: true };
        }
        catch (error) {
            this.logger.error(`Error processing PayPal webhook: ${error.message}`, error.stack);
            this.paymentLogsService.logWebhookProcessed({
                provider: 'paypal',
                eventType,
                eventId: event.id,
                success: false,
                error: error instanceof Error ? error : new Error(error.message),
            });
            throw new common_1.BadRequestException(`Webhook processing failed: ${error.message}`);
        }
    }
    async handlePayPalSubscriptionCreated(event) {
        const subscriptionId = event.resource?.id;
        if (!subscriptionId)
            return;
        const startTime = event.resource?.start_time
            ? new Date(event.resource.start_time)
            : new Date();
        const endTime = event.resource?.billing_info?.next_billing_time
            ? new Date(event.resource.billing_info.next_billing_time)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE, startTime, endTime, false, { paypalSubscription: event.resource });
    }
    async handlePayPalSubscriptionActivated(event) {
        const subscriptionId = event.resource?.id;
        if (!subscriptionId) {
            this.logger.warn('⚠️ [PayPal Subscription Activated] No subscription ID in event');
            this.logger.warn('⚠️ [PayPal Subscription Activated] Event data:', JSON.stringify(event, null, 2));
            return;
        }
        this.logger.log(`🔔 [PayPal Subscription Activated] ========== START ==========`);
        this.logger.log(`🔔 [PayPal Subscription Activated] Processing subscription: ${subscriptionId}`);
        this.logger.log(`🔔 [PayPal Subscription Activated] Full event data:`, JSON.stringify(event, null, 2));
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
        const subscription = await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, event.resource?.start_time ? new Date(event.resource.start_time) : undefined, event.resource?.billing_info?.next_billing_time
            ? new Date(event.resource.billing_info.next_billing_time)
            : undefined, false, { paypalSubscription: event.resource });
        if (existingSubscription) {
            const existingPayment = await this.paymentRepository
                .createQueryBuilder('payment')
                .where('payment.paymentMethod = :paymentMethod', { paymentMethod: payment_entity_1.PaymentMethodEnum.PAYPAL })
                .andWhere('payment.userId = :userId', { userId: subscription.userId })
                .andWhere(`(payment.metadata->>'paypalSubscriptionId' = :subscriptionId OR payment.metadata->>'subscriptionId' = :dbSubscriptionId)`, { subscriptionId, dbSubscriptionId: subscription.id })
                .getOne();
            if (!existingPayment) {
                const amount = subscription.amount || parseFloat(event.resource?.billing_info?.last_payment?.amount?.value || '0');
                const currency = subscription.currency || event.resource?.billing_info?.last_payment?.amount?.currency_code || 'AUD';
                if (amount > 0) {
                    const payment = this.paymentRepository.create({
                        userId: subscription.userId,
                        listingId: subscription.listingId,
                        paymentMethod: payment_entity_1.PaymentMethodEnum.PAYPAL,
                        status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
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
                }
                else {
                    this.logger.warn(`⚠️ [PayPal Subscription Activated] Amount is 0, skipping payment record creation`);
                }
            }
        }
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
                    const updateData = {};
                    if (event.resource?.billing_info?.next_billing_time) {
                        updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
                        this.logger.log(`📅 [PayPal Subscription Activated] Will update expiration to: ${updateData.expiresAt}`);
                    }
                    const listingAge = Date.now() - new Date(listing.createdAt).getTime();
                    const isRecentlyCreated = listingAge < 10 * 60 * 1000;
                    const hasNoPublishedAt = !listing.publishedAt;
                    this.logger.log(`📊 [PayPal Subscription Activated] Listing metadata:`, {
                        listingAge: `${Math.round(listingAge / 1000)}s`,
                        isRecentlyCreated,
                        hasNoPublishedAt,
                        publishedAt: listing.publishedAt,
                    });
                    if (listing.status === listing_entity_1.ListingStatusEnum.DRAFT) {
                        updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                        updateData.isActive = false;
                        this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
                        this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.EXPIRED) {
                        updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                        updateData.isActive = false;
                        this.logger.log(`🔄 [PayPal Subscription Activated] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
                        this.logger.log(`🔄 [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
                        updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                        updateData.isActive = false;
                        this.logger.log(`🔧 [PayPal Subscription Activated] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
                        this.logger.log(`🔧 [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
                        this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
                        this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
                    }
                    else if (event.resource?.billing_info?.next_billing_time) {
                        this.logger.log(`⏳ [PayPal Subscription Activated] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
                        this.logger.log(`⏳ [PayPal Subscription Activated] Update data:`, JSON.stringify(updateData, null, 2));
                    }
                    else {
                        this.logger.log(`ℹ️ [PayPal Subscription Activated] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
                    }
                    if (!listing.subscriptionId) {
                        updateData.subscriptionId = subscription.id;
                        this.logger.log(`✅ [PayPal Subscription Activated] Will update listing's subscriptionId to ${subscription.id}`);
                    }
                    if (Object.keys(updateData).length > 0) {
                        this.logger.log(`💾 [PayPal Subscription Activated] Executing database update...`);
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set(updateData)
                            .where('id = :listingId', { listingId: subscription.listingId })
                            .execute();
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
                            if (updateData.status === listing_entity_1.ListingStatusEnum.PENDING_REVIEW && updatedListing) {
                                const listingWithUser = await this.listingRepository.findOne({
                                    where: { id: subscription.listingId },
                                    relations: ['user', 'breedRelation'],
                                });
                                if (listingWithUser) {
                                    this.listingsService.sendListingPendingReviewEmail(listingWithUser).catch((error) => {
                                        this.logger.error(`Failed to send pending review email: ${error.message}`);
                                    });
                                }
                            }
                        }
                    }
                    else {
                        this.logger.log(`ℹ️ [PayPal Subscription Activated] No database update performed (updateData is empty)`);
                    }
                }
                else {
                    this.logger.warn(`⚠️ [PayPal Subscription Activated] Listing not found: ${subscription.listingId}`);
                }
            }
            catch (error) {
                this.logger.error(`❌ [PayPal Subscription Activated] Error activating listing ${subscription.listingId}:`, error);
                this.logger.error(`❌ [PayPal Subscription Activated] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
            }
        }
        else {
            this.logger.warn(`⚠️ [PayPal Subscription Activated] Subscription ${subscriptionId} is active but not linked to a listing.`);
        }
        this.logger.log(`🔔 [PayPal Subscription Activated] ========== END ==========`);
    }
    async handlePayPalSubscriptionCancelled(event) {
        const subscriptionId = event.resource?.id;
        if (!subscriptionId)
            return;
        const subscriptionEntity = await this.subscriptionRepository.findOne({
            where: { subscriptionId },
        });
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.CANCELLED, undefined, undefined, false, { paypalSubscription: event.resource, cancelledAt: new Date().toISOString() });
        if (subscriptionEntity?.listingId) {
            try {
                await this.listingRepository
                    .createQueryBuilder()
                    .update(listing_entity_1.Listing)
                    .set({
                    isActive: false,
                    status: listing_entity_1.ListingStatusEnum.EXPIRED,
                })
                    .where('id = :listingId', { listingId: subscriptionEntity.listingId })
                    .execute();
                this.logger.log(`Deactivated listing ${subscriptionEntity.listingId} due to PayPal subscription cancellation`);
            }
            catch (error) {
                this.logger.error(`Failed to deactivate listing ${subscriptionEntity.listingId}:`, error);
            }
        }
    }
    async handlePayPalSubscriptionUpdated(event) {
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
        const subscription = await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, status, event.resource?.start_time ? new Date(event.resource.start_time) : undefined, event.resource?.billing_info?.next_billing_time
            ? new Date(event.resource.billing_info.next_billing_time)
            : undefined, false, { paypalSubscription: event.resource });
        this.logger.log(`📊 [PayPal Subscription Updated] Subscription updated:`, {
            subscriptionId: subscription.id,
            listingId: subscription.listingId,
            status: subscription.status,
        });
        if (subscription.listingId) {
            const inactiveStatuses = [
                subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
                subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
                subscription_entity_1.SubscriptionStatusEnum.UNPAID,
                subscription_entity_1.SubscriptionStatusEnum.INCOMPLETE_EXPIRED,
            ];
            if (inactiveStatuses.includes(status)) {
                try {
                    await this.listingRepository
                        .createQueryBuilder()
                        .update(listing_entity_1.Listing)
                        .set({
                        isActive: false,
                        status: listing_entity_1.ListingStatusEnum.EXPIRED,
                    })
                        .where('id = :listingId', { listingId: subscription.listingId })
                        .execute();
                    this.logger.log(`Deactivated listing ${subscription.listingId} due to PayPal subscription status: ${status}`);
                }
                catch (error) {
                    this.logger.error(`Failed to deactivate listing ${subscription.listingId}:`, error);
                }
            }
            else if (status === subscription_entity_1.SubscriptionStatusEnum.ACTIVE) {
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
                        const updateData = {};
                        if (event.resource?.billing_info?.next_billing_time) {
                            updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
                            this.logger.log(`📅 [PayPal Subscription Updated] Will update expiration to: ${updateData.expiresAt}`);
                        }
                        const listingAge = Date.now() - new Date(listing.createdAt).getTime();
                        const isRecentlyCreated = listingAge < 10 * 60 * 1000;
                        const hasNoPublishedAt = !listing.publishedAt;
                        this.logger.log(`📊 [PayPal Subscription Updated] Listing metadata:`, {
                            listingAge: `${Math.round(listingAge / 1000)}s`,
                            isRecentlyCreated,
                            hasNoPublishedAt,
                            publishedAt: listing.publishedAt,
                        });
                        if (listing.status === listing_entity_1.ListingStatusEnum.DRAFT) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
                            this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
                        }
                        else if (listing.status === listing_entity_1.ListingStatusEnum.EXPIRED) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            this.logger.log(`🔄 [PayPal Subscription Updated] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
                            this.logger.log(`🔄 [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
                        }
                        else if (listing.status === listing_entity_1.ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
                            updateData.status = listing_entity_1.ListingStatusEnum.PENDING_REVIEW;
                            updateData.isActive = false;
                            this.logger.log(`🔧 [PayPal Subscription Updated] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
                            this.logger.log(`🔧 [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
                        }
                        else if (listing.status === listing_entity_1.ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
                            this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
                            this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
                        }
                        else if (event.resource?.billing_info?.next_billing_time) {
                            this.logger.log(`⏳ [PayPal Subscription Updated] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
                            this.logger.log(`⏳ [PayPal Subscription Updated] Update data:`, JSON.stringify(updateData, null, 2));
                        }
                        else {
                            this.logger.log(`ℹ️ [PayPal Subscription Updated] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
                        }
                        if (Object.keys(updateData).length > 0) {
                            this.logger.log(`💾 [PayPal Subscription Updated] Executing database update...`);
                            await this.listingRepository
                                .createQueryBuilder()
                                .update(listing_entity_1.Listing)
                                .set(updateData)
                                .where('id = :listingId', { listingId: subscription.listingId })
                                .execute();
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
                        }
                        else {
                            this.logger.log(`ℹ️ [PayPal Subscription Updated] No database update performed (updateData is empty)`);
                        }
                    }
                    else {
                        this.logger.warn(`⚠️ [PayPal Subscription Updated] Listing not found: ${subscription.listingId}`);
                    }
                }
                catch (error) {
                    this.logger.error(`❌ [PayPal Subscription Updated] Error updating listing ${subscription.listingId}:`, error);
                    this.logger.error(`❌ [PayPal Subscription Updated] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
                }
            }
            else {
                this.logger.log(`ℹ️ [PayPal Subscription Updated] Subscription status is ${status}, not ACTIVE. Skipping listing update.`);
            }
        }
        else {
            this.logger.warn(`⚠️ [PayPal Subscription Updated] Subscription ${subscriptionId} has no listingId`);
        }
        this.logger.log(`🔔 [PayPal Subscription Updated] ========== END ==========`);
    }
    async handlePayPalPaymentCompleted(event) {
        this.logger.log(`🔔 [PayPal Payment Completed] ========== START ==========`);
        this.logger.log(`🔔 [PayPal Payment Completed] Full event data:`, JSON.stringify(event, null, 2));
        const subscriptionId = event.resource?.billing_agreement_id ||
            event.resource?.subscription_id ||
            event.resource?.id;
        if (!subscriptionId) {
            this.logger.warn(`⚠️ [PayPal Payment Completed] No subscription ID found in event: ${JSON.stringify(event.resource)}`);
            this.logger.log(`🔔 [PayPal Payment Completed] ========== END (NO SUBSCRIPTION ID) ==========`);
            return;
        }
        this.logger.log(`🔔 [PayPal Payment Completed] Processing subscription: ${subscriptionId}`);
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
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, undefined, undefined, undefined, { lastPaymentSucceeded: new Date().toISOString(), saleId: event.resource?.id });
        const amount = parseFloat(event.resource?.amount?.total || event.resource?.amount?.value || '0');
        const currency = event.resource?.amount?.currency || event.resource?.amount?.currency_code || subscription.currency || 'AUD';
        if (amount > 0) {
            const saleId = event.resource?.id;
            const existingPayment = saleId ? await this.paymentRepository.findOne({
                where: {
                    metadata: {
                        paypalSaleId: saleId,
                    },
                },
            }) : null;
            if (!existingPayment) {
                const payment = this.paymentRepository.create({
                    userId: subscription.userId,
                    listingId: subscription.listingId,
                    paymentMethod: payment_entity_1.PaymentMethodEnum.PAYPAL,
                    status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
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
        await this.subscriptionsService.handleSubscriptionRenewal(subscriptionId, amount, currency);
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
                    const listingAge = Date.now() - new Date(listing.createdAt).getTime();
                    const isRecentlyCreated = listingAge < 10 * 60 * 1000;
                    const hasNoPublishedAt = !listing.publishedAt;
                    this.logger.log(`📊 [PayPal Payment Completed] Listing metadata:`, {
                        listingAge: `${Math.round(listingAge / 1000)}s`,
                        isRecentlyCreated,
                        hasNoPublishedAt,
                        publishedAt: listing.publishedAt,
                    });
                    if (listing.status === listing_entity_1.ListingStatusEnum.DRAFT) {
                        const updateData = {
                            status: listing_entity_1.ListingStatusEnum.PENDING_REVIEW,
                            isActive: false,
                        };
                        if (!listing.subscriptionId) {
                            updateData.subscriptionId = subscription.id;
                            this.logger.log(`✅ [PayPal Payment Completed] Will update listing's subscriptionId to ${subscription.id}`);
                        }
                        if (event.resource?.billing_info?.next_billing_time) {
                            updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
                            this.logger.log(`📅 [PayPal Payment Completed] Will update expiration to: ${updateData.expiresAt}`);
                        }
                        this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Changing listing from DRAFT to PENDING_REVIEW for admin approval`);
                        this.logger.log(`⏳ [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));
                        this.logger.log(`💾 [PayPal Payment Completed] Executing database update...`);
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set(updateData)
                            .where('id = :listingId', { listingId: subscription.listingId })
                            .execute();
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
                        if (updatedListing) {
                            const listingWithUser = await this.listingRepository.findOne({
                                where: { id: subscription.listingId },
                                relations: ['user', 'breedRelation'],
                            });
                            if (listingWithUser) {
                                this.listingsService.sendListingPendingReviewEmail(listingWithUser).catch((error) => {
                                    this.logger.error(`Failed to send pending review email: ${error.message}`);
                                });
                            }
                        }
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.ACTIVE && isRecentlyCreated && hasNoPublishedAt) {
                        const updateData = {
                            status: listing_entity_1.ListingStatusEnum.PENDING_REVIEW,
                            isActive: false,
                        };
                        if (event.resource?.billing_info?.next_billing_time) {
                            updateData.expiresAt = new Date(event.resource.billing_info.next_billing_time);
                            this.logger.log(`📅 [PayPal Payment Completed] Will update expiration to: ${updateData.expiresAt}`);
                        }
                        this.logger.log(`🔧 [PayPal Payment Completed] DECISION: Listing is ACTIVE but recently created and not published. Changing to PENDING_REVIEW for admin approval`);
                        this.logger.log(`🔧 [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));
                        this.logger.log(`💾 [PayPal Payment Completed] Executing database update...`);
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set(updateData)
                            .where('id = :listingId', { listingId: subscription.listingId })
                            .execute();
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
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.PENDING_REVIEW && event.resource?.billing_info?.next_billing_time) {
                        this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Updated listing expiration, keeping in PENDING_REVIEW`);
                        await this.updateListingExpiration(subscription.listingId, new Date(event.resource.billing_info.next_billing_time));
                        this.logger.log(`⏳ [PayPal Payment Completed] Updated listing expiration, keeping in PENDING_REVIEW: ${subscription.listingId}`);
                    }
                    else if (listing.status === listing_entity_1.ListingStatusEnum.EXPIRED && event.resource?.billing_info?.next_billing_time) {
                        const updateData = {
                            status: listing_entity_1.ListingStatusEnum.PENDING_REVIEW,
                            isActive: false,
                            expiresAt: new Date(event.resource.billing_info.next_billing_time),
                        };
                        this.logger.log(`🔄 [PayPal Payment Completed] DECISION: Reactivating expired listing, changing from EXPIRED to PENDING_REVIEW for admin approval`);
                        this.logger.log(`🔄 [PayPal Payment Completed] Update data:`, JSON.stringify(updateData, null, 2));
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set(updateData)
                            .where('id = :listingId', { listingId: subscription.listingId })
                            .execute();
                        this.logger.log(`✅ [PayPal Payment Completed] Reactivated expired listing to PENDING_REVIEW: ${subscription.listingId}`);
                        const listingWithUser = await this.listingRepository.findOne({
                            where: { id: subscription.listingId },
                            relations: ['user', 'breedRelation'],
                        });
                        if (listingWithUser) {
                            this.listingsService.sendListingPendingReviewEmail(listingWithUser).catch((error) => {
                                this.logger.error(`Failed to send pending review email: ${error.message}`);
                            });
                        }
                    }
                    else if (event.resource?.billing_info?.next_billing_time) {
                        this.logger.log(`⏳ [PayPal Payment Completed] DECISION: Updated listing expiration, keeping status as: ${listing.status}`);
                        await this.updateListingExpiration(subscription.listingId, new Date(event.resource.billing_info.next_billing_time));
                    }
                    else {
                        this.logger.log(`ℹ️ [PayPal Payment Completed] DECISION: No update needed. Listing status: ${listing.status}, isActive: ${listing.isActive}`);
                    }
                }
                else {
                    this.logger.warn(`⚠️ [PayPal Payment Completed] Listing not found: ${subscription.listingId}`);
                }
            }
            catch (error) {
                this.logger.error(`❌ [PayPal Payment Completed] Error updating listing ${subscription.listingId}:`, error);
                this.logger.error(`❌ [PayPal Payment Completed] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
            }
        }
        else {
            this.logger.warn(`⚠️ [PayPal Payment Completed] Subscription ${subscriptionId} has no listingId`);
        }
        this.logger.log(`🔔 [PayPal Payment Completed] ========== END ==========`);
    }
    async handlePayPalPaymentFailed(event) {
        const subscriptionId = event.resource?.billing_agreement_id ||
            event.resource?.subscription_id ||
            event.resource?.id;
        if (!subscriptionId) {
            this.logger.warn(`⚠️ [PayPal Payment Failed] No subscription ID found in event: ${JSON.stringify(event.resource)}`);
            return;
        }
        const subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId },
        });
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.PAST_DUE, undefined, undefined, undefined, { lastPaymentFailed: new Date().toISOString(), saleId: event.resource?.id });
        if (subscription?.listingId) {
            try {
                await this.listingRepository
                    .createQueryBuilder()
                    .update(listing_entity_1.Listing)
                    .set({
                    isActive: false,
                    status: listing_entity_1.ListingStatusEnum.EXPIRED,
                })
                    .where('id = :listingId', { listingId: subscription.listingId })
                    .execute();
                this.logger.log(`Deactivated listing ${subscription.listingId} due to PayPal payment failure`);
            }
            catch (error) {
                this.logger.error(`Failed to deactivate listing ${subscription.listingId}:`, error);
            }
        }
    }
    mapPayPalStatus(status) {
        const statusMap = {
            ACTIVE: subscription_entity_1.SubscriptionStatusEnum.ACTIVE,
            CANCELLED: subscription_entity_1.SubscriptionStatusEnum.CANCELLED,
            EXPIRED: subscription_entity_1.SubscriptionStatusEnum.EXPIRED,
            SUSPENDED: subscription_entity_1.SubscriptionStatusEnum.PAST_DUE,
        };
        return statusMap[status] || subscription_entity_1.SubscriptionStatusEnum.ACTIVE;
    }
};
exports.SubscriptionWebhooksController = SubscriptionWebhooksController;
__decorate([
    (0, common_1.Post)('stripe/subscriptions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionWebhooksController.prototype, "handleStripeWebhook", null);
__decorate([
    (0, common_1.Get)('stripe/test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionWebhooksController.prototype, "testWebhookEndpoint", null);
__decorate([
    (0, common_1.Post)('paypal/subscriptions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionWebhooksController.prototype, "handlePayPalWebhook", null);
exports.SubscriptionWebhooksController = SubscriptionWebhooksController = SubscriptionWebhooksController_1 = __decorate([
    (0, common_1.Controller)('webhooks'),
    __param(3, (0, typeorm_1.InjectRepository)(listing_entity_1.Listing)),
    __param(4, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(5, (0, typeorm_1.InjectRepository)(subscription_entity_1.Subscription)),
    __param(6, (0, common_1.Inject)((0, common_1.forwardRef)(() => listings_service_1.ListingsService))),
    __metadata("design:paramtypes", [config_1.ConfigService,
        subscriptions_service_1.SubscriptionsService,
        payment_logs_service_1.PaymentLogsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        listings_service_1.ListingsService])
], SubscriptionWebhooksController);
//# sourceMappingURL=subscription-webhooks.controller.js.map