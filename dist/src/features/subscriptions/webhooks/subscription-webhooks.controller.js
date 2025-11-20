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
const paypal = require('@paypal/checkout-server-sdk');
let SubscriptionWebhooksController = SubscriptionWebhooksController_1 = class SubscriptionWebhooksController {
    constructor(configService, subscriptionsService, paymentLogsService, listingRepository, paymentRepository, subscriptionRepository) {
        this.configService = configService;
        this.subscriptionsService = subscriptionsService;
        this.paymentLogsService = paymentLogsService;
        this.listingRepository = listingRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.logger = new common_1.Logger(SubscriptionWebhooksController_1.name);
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
            this.stripe = new stripe_1.default(stripeSecretKey);
        }
    }
    async handleStripeWebhook(req, signature) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        if (!this.stripe) {
            throw new common_1.BadRequestException('Stripe not configured');
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            this.paymentLogsService.logError({
                provider: 'stripe',
                error: err instanceof Error ? err : new Error(err.message),
                context: { webhookSignature: signature?.substring(0, 20) + '...' },
            });
            throw new common_1.BadRequestException(`Webhook signature verification failed: ${err.message}`);
        }
        this.paymentLogsService.logWebhookReceived({
            provider: 'stripe',
            eventType: event.type,
            eventId: event.id,
            requestData: { object: event.data.object },
        });
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    this.logger.debug(`Unhandled event type: ${event.type}`);
            }
            this.paymentLogsService.logWebhookProcessed({
                provider: 'stripe',
                eventType: event.type,
                eventId: event.id,
                success: true,
                responseData: { processed: true },
            });
            return { received: true };
        }
        catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
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
        const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(subscription.id, this.mapStripeStatus(subscription.status), new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), subscription.cancel_at_period_end, { stripeSubscription: subscription });
        if (subscriptionEntity.listingId) {
            await this.updateListingExpiration(subscriptionEntity.listingId, new Date(subscription.current_period_end * 1000));
        }
    }
    async handleSubscriptionUpdated(subscription) {
        const subscriptionEntity = await this.subscriptionsService.updateSubscriptionStatus(subscription.id, this.mapStripeStatus(subscription.status), new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), subscription.cancel_at_period_end, { stripeSubscription: subscription });
        if (subscriptionEntity.listingId) {
            await this.updateListingExpiration(subscriptionEntity.listingId, new Date(subscription.current_period_end * 1000));
        }
    }
    async handleSubscriptionDeleted(subscription) {
        await this.subscriptionsService.updateSubscriptionStatus(subscription.id, subscription_entity_1.SubscriptionStatusEnum.CANCELLED, new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000), false, { stripeSubscription: subscription, deletedAt: new Date().toISOString() });
    }
    async handlePaymentSucceeded(invoice) {
        const subscriptionId = invoice.subscription;
        if (!subscriptionId)
            return;
        const subscription = await this.subscriptionRepository.findOne({
            where: { subscriptionId },
            relations: ['user'],
        });
        if (!subscription) {
            this.logger.warn(`Subscription not found for Stripe subscription ID: ${subscriptionId}`);
            return;
        }
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, undefined, undefined, undefined, { lastPaymentSucceeded: new Date().toISOString() });
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
        const subscriptionId = invoice.subscription;
        if (!subscriptionId)
            return;
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.PAST_DUE, undefined, undefined, undefined, { lastPaymentFailed: new Date().toISOString(), invoiceId: invoice.id });
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
    async updateListingExpiration(listingId, expiresAt) {
        try {
            await this.listingRepository
                .createQueryBuilder()
                .update(listing_entity_1.Listing)
                .set({ expiresAt })
                .where('id = :listingId', { listingId })
                .execute();
        }
        catch (error) {
            this.logger.error(`Failed to update listing expiration: ${error}`);
        }
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
        try {
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
                throw new common_1.BadRequestException('Webhook signature verification failed');
            }
        }
        catch (err) {
            this.logger.error(`PayPal webhook verification failed: ${err.message}`);
            this.paymentLogsService.logError({
                provider: 'paypal',
                error: err instanceof Error ? err : new Error(err.message),
                context: { webhookHeaders: Object.keys(headers) },
            });
            throw new common_1.BadRequestException(`Webhook verification failed: ${err.message}`);
        }
        const event = req.body;
        const eventType = event.event_type;
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
        if (!subscriptionId)
            return;
        const subscription = await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, event.resource?.start_time ? new Date(event.resource.start_time) : undefined, event.resource?.billing_info?.next_billing_time
            ? new Date(event.resource.billing_info.next_billing_time)
            : undefined, false, { paypalSubscription: event.resource });
        if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
            await this.updateListingExpiration(subscription.listingId, new Date(event.resource.billing_info.next_billing_time));
        }
    }
    async handlePayPalSubscriptionCancelled(event) {
        const subscriptionId = event.resource?.id;
        if (!subscriptionId)
            return;
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.CANCELLED, undefined, undefined, false, { paypalSubscription: event.resource, cancelledAt: new Date().toISOString() });
    }
    async handlePayPalSubscriptionUpdated(event) {
        const subscriptionId = event.resource?.id;
        if (!subscriptionId)
            return;
        const status = this.mapPayPalStatus(event.resource?.status);
        const subscription = await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, status, event.resource?.start_time ? new Date(event.resource.start_time) : undefined, event.resource?.billing_info?.next_billing_time
            ? new Date(event.resource.billing_info.next_billing_time)
            : undefined, false, { paypalSubscription: event.resource });
        if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
            await this.updateListingExpiration(subscription.listingId, new Date(event.resource.billing_info.next_billing_time));
        }
    }
    async handlePayPalPaymentCompleted(event) {
        const subscriptionId = event.resource?.billing_agreement_id;
        if (!subscriptionId)
            return;
        const subscription = await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.ACTIVE, undefined, undefined, undefined, { lastPaymentSucceeded: new Date().toISOString(), saleId: event.resource?.id });
        const amount = parseFloat(event.resource?.amount?.total || '0');
        const currency = event.resource?.amount?.currency || 'USD';
        await this.subscriptionsService.handleSubscriptionRenewal(subscriptionId, amount, currency);
        if (subscription.listingId && event.resource?.billing_info?.next_billing_time) {
            await this.updateListingExpiration(subscription.listingId, new Date(event.resource.billing_info.next_billing_time));
        }
    }
    async handlePayPalPaymentFailed(event) {
        const subscriptionId = event.resource?.billing_agreement_id;
        if (!subscriptionId)
            return;
        await this.subscriptionsService.updateSubscriptionStatus(subscriptionId, subscription_entity_1.SubscriptionStatusEnum.PAST_DUE, undefined, undefined, undefined, { lastPaymentFailed: new Date().toISOString(), saleId: event.resource?.id });
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
    __metadata("design:paramtypes", [config_1.ConfigService,
        subscriptions_service_1.SubscriptionsService,
        payment_logs_service_1.PaymentLogsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SubscriptionWebhooksController);
//# sourceMappingURL=subscription-webhooks.controller.js.map