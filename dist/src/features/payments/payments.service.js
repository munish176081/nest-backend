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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stripe_1 = require("stripe");
const payment_entity_1 = require("./entities/payment.entity");
const listing_entity_1 = require("../listings/entities/listing.entity");
const payment_logs_service_1 = require("./payment-logs.service");
const config_2 = require("../../config/config");
const paypal = require('@paypal/checkout-server-sdk');
let PaymentsService = class PaymentsService {
    constructor(configService, paymentRepository, listingRepository, paymentLogsService) {
        this.configService = configService;
        this.paymentRepository = paymentRepository;
        this.listingRepository = listingRepository;
        this.paymentLogsService = paymentLogsService;
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            console.warn('STRIPE_SECRET_KEY not found in environment variables');
        }
        else {
            this.stripe = new stripe_1.default(stripeSecretKey);
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
    async createStripePaymentIntent(amount, listingType, userId, listingId) {
        if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || (typeof userId === 'string' && userId.trim() === '')) {
            console.error('Invalid userId in createStripePaymentIntent:', {
                userId,
                userIdType: typeof userId,
                listingType,
                amount,
            });
            throw new common_1.BadRequestException('User ID is required and must be valid. Please log in again.');
        }
        if (!this.stripe) {
            throw new common_1.InternalServerErrorException('Stripe is not configured');
        }
        try {
            let customerId;
            const user = await this.listingRepository.manager
                .getRepository('users')
                .findOne({ where: { id: userId } });
            const existingCustomers = await this.stripe.customers.list({
                email: user?.email,
                limit: 1,
            });
            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
                console.log('✅ [Payment] Using existing Stripe customer:', customerId);
            }
            else {
                const customer = await this.stripe.customers.create({
                    email: user?.email,
                    phone: user?.phone,
                    name: user?.name,
                    metadata: { userId },
                });
                customerId = customer.id;
                console.log('✅ [Payment] Created new Stripe customer:', customerId);
            }
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency: config_2.config.defaultPaymentCurrency.toLowerCase(),
                customer: customerId,
                metadata: {
                    userId,
                    listingType,
                    ...(listingId && { listingId }),
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            const validatedUserId = String(userId).trim();
            if (!validatedUserId || validatedUserId === 'null' || validatedUserId === 'undefined' || validatedUserId === '') {
                console.error('Invalid userId when creating payment record:', {
                    userId,
                    validatedUserId,
                    listingType,
                    amount,
                    userIdType: typeof userId,
                });
                throw new common_1.BadRequestException('Invalid user ID. Please log in again.');
            }
            console.log('Creating payment record with userId:', validatedUserId);
            const paymentData = {
                userId: validatedUserId,
                listingId: listingId || null,
                paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                status: payment_entity_1.PaymentStatusEnum.PENDING,
                amount: amount / 100,
                currency: config_2.config.defaultPaymentCurrency,
                paymentIntentId: paymentIntent.id,
                listingType,
                metadata: {
                    stripePaymentIntent: paymentIntent,
                },
            };
            console.log('Payment data before create:', JSON.stringify({ ...paymentData, metadata: '...' }));
            const payment = this.paymentRepository.create(paymentData);
            if (!payment.userId || payment.userId !== validatedUserId) {
                payment.userId = validatedUserId;
                console.log('Explicitly set userId on payment object:', payment.userId);
            }
            if (!payment.userId || payment.userId === null || payment.userId === undefined || payment.userId === 'null' || payment.userId === 'undefined' || String(payment.userId).trim() === '') {
                console.error('Payment object missing userId before save:', {
                    payment: JSON.stringify(payment),
                    validatedUserId,
                    userId,
                });
                throw new common_1.BadRequestException('Payment record is missing user ID. Please log in again.');
            }
            console.log('Saving payment with userId:', payment.userId, 'payment object:', JSON.stringify({ userId: payment.userId, paymentIntentId: payment.paymentIntentId }));
            try {
                const paymentIntentData = JSON.parse(JSON.stringify(paymentIntent));
                const insertResult = await this.paymentRepository
                    .createQueryBuilder()
                    .insert()
                    .into(payment_entity_1.Payment)
                    .values({
                    userId: validatedUserId,
                    listingId: listingId || null,
                    paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                    status: payment_entity_1.PaymentStatusEnum.PENDING,
                    amount: amount / 100,
                    currency: config_2.config.defaultPaymentCurrency,
                    paymentIntentId: paymentIntent.id,
                    listingType,
                    metadata: {
                        stripePaymentIntent: paymentIntentData,
                    },
                })
                    .returning('*')
                    .execute();
                const rawPayment = insertResult.raw[0];
                const savedPayment = {
                    id: rawPayment.id,
                    userId: rawPayment.user_id || rawPayment.userId,
                    listingId: rawPayment.listing_id || rawPayment.listingId,
                    paymentMethod: rawPayment.payment_method || rawPayment.paymentMethod,
                    status: rawPayment.status,
                    amount: rawPayment.amount,
                    currency: rawPayment.currency,
                    paymentIntentId: rawPayment.payment_intent_id || rawPayment.paymentIntentId,
                    listingType: rawPayment.listing_type || rawPayment.listingType,
                    metadata: rawPayment.metadata,
                };
                console.log('Payment saved successfully with id:', savedPayment.id, 'userId:', savedPayment.userId);
                this.paymentLogsService.logPaymentCreated({
                    userId: validatedUserId,
                    paymentId: savedPayment.id,
                    listingId: listingId || undefined,
                    amount: amount / 100,
                    currency: config_2.config.defaultPaymentCurrency,
                    provider: 'stripe',
                    listingType,
                    metadata: { paymentIntentId: paymentIntent.id },
                });
                return {
                    clientSecret: paymentIntent.client_secret,
                    paymentId: savedPayment.id,
                };
            }
            catch (saveError) {
                console.error('Error saving payment to database:', {
                    error: saveError,
                    errorMessage: saveError.message,
                    errorCode: saveError.code,
                    paymentUserId: payment.userId,
                    validatedUserId,
                    originalUserId: userId,
                });
                this.paymentLogsService.logPaymentFailed({
                    userId: validatedUserId,
                    amount: amount / 100,
                    currency: config_2.config.defaultPaymentCurrency,
                    provider: 'stripe',
                    error: saveError instanceof Error ? saveError : new Error(saveError.message || 'Unknown error'),
                    metadata: { listingType, listingId },
                });
                if (saveError.message && saveError.message.includes('userId') && saveError.message.includes('not-null')) {
                    throw new common_1.BadRequestException('User ID is missing. Please log in again and try again.');
                }
                throw saveError;
            }
        }
        catch (error) {
            console.error('Error creating Stripe payment intent:', error);
            this.paymentLogsService.logPaymentFailed({
                userId,
                amount: amount / 100,
                currency: config_2.config.defaultPaymentCurrency,
                provider: 'stripe',
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                metadata: { listingType, listingId },
            });
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Failed to create payment intent');
        }
    }
    async confirmStripePayment(paymentIntentId, paymentMethodId, userId) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID is required to confirm a payment');
        }
        if (!this.stripe) {
            throw new common_1.InternalServerErrorException('Stripe is not configured');
        }
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.metadata.userId !== userId) {
                throw new common_1.BadRequestException('Payment intent does not belong to user');
            }
            let payment = await this.paymentRepository.findOne({
                where: { paymentIntentId, userId },
            });
            if (!payment) {
                const validatedUserId = String(userId).trim();
                if (!validatedUserId || validatedUserId === 'null' || validatedUserId === 'undefined' || validatedUserId === '') {
                    console.error('Invalid userId in confirmStripePayment backward compatibility:', {
                        userId,
                        validatedUserId,
                        paymentIntentId,
                    });
                    throw new common_1.BadRequestException('Invalid user ID. Please log in again.');
                }
                payment = this.paymentRepository.create({
                    userId: validatedUserId,
                    paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                    status: payment_entity_1.PaymentStatusEnum.PROCESSING,
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency.toUpperCase(),
                    paymentIntentId,
                    paymentMethodId,
                    listingType: paymentIntent.metadata.listingType || null,
                    listingId: paymentIntent.metadata.listingId || null,
                    metadata: {
                        stripePaymentIntent: paymentIntent,
                    },
                });
                if (!payment.userId || String(payment.userId).trim() === '') {
                    console.error('Payment object missing userId in confirmStripePayment:', payment);
                    throw new common_1.BadRequestException('Payment record is missing user ID.');
                }
                payment = await this.paymentRepository.save(payment);
            }
            else {
                payment.paymentMethodId = paymentMethodId;
                payment.status = payment_entity_1.PaymentStatusEnum.PROCESSING;
                await this.paymentRepository.save(payment);
            }
            const paymentIntentStatus = paymentIntent.status;
            if (paymentIntentStatus === 'succeeded') {
                payment.status = payment_entity_1.PaymentStatusEnum.SUCCEEDED;
                payment.metadata = {
                    ...payment.metadata,
                    stripePaymentIntent: paymentIntent,
                };
                await this.paymentRepository.save(payment);
                return {
                    success: true,
                    listingId: paymentIntent.metadata.listingId,
                    paymentId: payment.id,
                };
            }
            let confirmed = paymentIntent;
            if (paymentIntentStatus !== 'succeeded') {
                try {
                    confirmed = await this.stripe.paymentIntents.confirm(paymentIntentId, {
                        payment_method: paymentMethodId,
                    });
                }
                catch (confirmError) {
                    if (confirmError.code === 'payment_intent_unexpected_state' && paymentIntentStatus === 'succeeded') {
                        confirmed = paymentIntent;
                    }
                    else {
                        throw confirmError;
                    }
                }
            }
            const confirmedStatus = confirmed.status;
            if (confirmedStatus === 'succeeded') {
                payment.status = payment_entity_1.PaymentStatusEnum.SUCCEEDED;
                payment.metadata = {
                    ...payment.metadata,
                    stripePaymentIntent: confirmed,
                };
                await this.paymentRepository.save(payment);
                const listingId = confirmed.metadata.listingId || payment.listingId;
                this.paymentLogsService.logPaymentConfirmed({
                    userId: payment.userId,
                    paymentId: payment.id,
                    listingId: listingId || undefined,
                    amount: payment.amount,
                    currency: payment.currency,
                    provider: 'stripe',
                    status: payment.status,
                    metadata: { paymentIntentId: confirmed.id },
                });
                if (listingId) {
                    try {
                        console.log('💳 [Stripe] Updating listing paymentId:', { listingId, paymentId: payment.id });
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set({ paymentId: payment.id })
                            .where('id = :listingId', { listingId })
                            .execute();
                        console.log('💳 [Stripe] Listing paymentId updated successfully');
                    }
                    catch (updateError) {
                        console.error('💳 [Stripe] Error updating listing paymentId:', updateError);
                    }
                }
                return {
                    success: true,
                    listingId: listingId || confirmed.metadata.listingId || undefined,
                    paymentId: payment.id,
                };
            }
            payment.status = payment_entity_1.PaymentStatusEnum.FAILED;
            payment.metadata = {
                ...payment.metadata,
                errorMessage: 'Payment confirmation failed',
                stripePaymentIntent: confirmed,
            };
            await this.paymentRepository.save(payment);
            this.paymentLogsService.logPaymentFailed({
                userId: payment.userId,
                paymentId: payment.id,
                listingId: payment.listingId || undefined,
                amount: payment.amount,
                currency: payment.currency,
                provider: 'stripe',
                error: new Error('Payment confirmation failed'),
                metadata: { paymentIntentId: confirmed.id },
            });
            throw new common_1.BadRequestException('Payment confirmation failed');
        }
        catch (error) {
            let payment = null;
            try {
                payment = await this.paymentRepository.findOne({
                    where: { paymentIntentId, userId },
                });
                if (payment) {
                    payment.status = payment_entity_1.PaymentStatusEnum.FAILED;
                    payment.metadata = {
                        ...payment.metadata,
                        errorMessage: error.message || 'Payment failed',
                    };
                    await this.paymentRepository.save(payment);
                }
            }
            catch (updateError) {
                console.error('Error updating payment record:', updateError);
            }
            console.error('Error confirming Stripe payment:', error);
            this.paymentLogsService.logPaymentFailed({
                userId,
                paymentId: payment?.id,
                provider: 'stripe',
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                metadata: { paymentIntentId },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to confirm payment');
        }
    }
    async createPayPalOrder(amount, listingType, userId, listingId) {
        console.log('💰 [PayPal] createPayPalOrder called:', { amount, listingType, userId, listingId });
        if (!userId) {
            console.error('💰 [PayPal] Error: User ID is required');
            throw new common_1.BadRequestException('User ID is required to create a payment');
        }
        if (!this.paypalClient) {
            console.error('💰 [PayPal] Error: PayPal client not configured');
            throw new common_1.InternalServerErrorException('PayPal is not configured');
        }
        try {
            console.log('💰 [PayPal] Creating PayPal order request...');
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer('return=representation');
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: config_2.config.defaultPaymentCurrency,
                            value: amount.toFixed(2),
                        },
                        description: `Listing payment for ${listingType}`,
                        custom_id: userId,
                        ...(listingId && {
                            invoice_id: listingId,
                        }),
                    },
                ],
            });
            const order = await this.paypalClient.execute(request);
            console.log('💰 [PayPal] Order created successfully:', { orderId: order.result.id, status: order.result.status });
            if (!userId || userId === 'null' || userId === 'undefined') {
                console.error('Invalid userId when creating PayPal payment:', { userId, listingType, amount });
                throw new common_1.BadRequestException('Invalid user ID. Please log in again.');
            }
            const validatedUserId = String(userId).trim();
            if (!validatedUserId || validatedUserId === 'null' || validatedUserId === 'undefined' || validatedUserId === '') {
                console.error('Invalid userId when creating PayPal payment record:', {
                    userId,
                    validatedUserId,
                    listingType,
                    amount,
                    userIdType: typeof userId,
                });
                throw new common_1.BadRequestException('Invalid user ID. Please log in again.');
            }
            console.log('Creating PayPal payment record with userId:', validatedUserId);
            const payment = this.paymentRepository.create({
                userId: validatedUserId,
                listingId: listingId || null,
                paymentMethod: payment_entity_1.PaymentMethodEnum.PAYPAL,
                status: payment_entity_1.PaymentStatusEnum.PENDING,
                amount: parseFloat(amount.toFixed(2)),
                currency: config_2.config.defaultPaymentCurrency,
                paypalOrderId: order.result.id,
                listingType,
                metadata: {
                    paypalOrder: order.result,
                },
            });
            if (!payment.userId || payment.userId === null || payment.userId === undefined || payment.userId === 'null' || payment.userId === 'undefined' || String(payment.userId).trim() === '') {
                console.error('PayPal payment object missing userId before save:', {
                    payment: JSON.stringify(payment),
                    validatedUserId,
                    userId,
                });
                throw new common_1.BadRequestException('Payment record is missing user ID. Please log in again.');
            }
            console.log('Saving PayPal payment with userId:', payment.userId);
            const insertResult = await this.paymentRepository
                .createQueryBuilder()
                .insert()
                .into(payment_entity_1.Payment)
                .values({
                userId: validatedUserId,
                listingId: listingId || null,
                paymentMethod: payment_entity_1.PaymentMethodEnum.PAYPAL,
                status: payment_entity_1.PaymentStatusEnum.PENDING,
                amount: parseFloat(amount.toFixed(2)),
                currency: config_2.config.defaultPaymentCurrency,
                paypalOrderId: order.result.id,
                listingType,
                metadata: {
                    paypalOrder: order.result,
                },
            })
                .returning('*')
                .execute();
            const rawPayment = insertResult.raw[0];
            const savedPayment = {
                id: rawPayment.id,
                userId: rawPayment.user_id || rawPayment.userId,
                listingId: rawPayment.listing_id || rawPayment.listingId,
                paymentMethod: rawPayment.payment_method || rawPayment.paymentMethod,
                status: rawPayment.status,
                amount: rawPayment.amount,
                currency: rawPayment.currency,
                paypalOrderId: rawPayment.paypal_order_id || rawPayment.paypalOrderId,
                listingType: rawPayment.listing_type || rawPayment.listingType,
                metadata: rawPayment.metadata,
            };
            console.log('💰 [PayPal] Payment record saved successfully:', { paymentId: savedPayment.id, orderId: order.result.id });
            this.paymentLogsService.logPaymentCreated({
                userId: validatedUserId,
                paymentId: savedPayment.id,
                listingId: listingId || undefined,
                amount: amount,
                currency: config_2.config.defaultPaymentCurrency,
                provider: 'paypal',
                listingType,
                metadata: { paypalOrderId: order.result.id },
            });
            return {
                orderId: order.result.id,
                paymentId: savedPayment.id,
            };
        }
        catch (error) {
            console.error('💰 [PayPal] Error creating PayPal order:', error);
            this.paymentLogsService.logPaymentFailed({
                userId,
                amount: amount,
                currency: config_2.config.defaultPaymentCurrency,
                provider: 'paypal',
                error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
                metadata: { listingType, listingId },
            });
            throw new common_1.BadRequestException(error.message || 'Failed to create PayPal order');
        }
    }
    async capturePayPalPayment(orderId, userId) {
        console.log('💰 [PayPal] capturePayPalPayment called:', { orderId, userId });
        if (!userId) {
            console.error('💰 [PayPal] Error: User ID is required for capture');
            throw new common_1.BadRequestException('User ID is required to capture a payment');
        }
        if (!this.paypalClient) {
            console.error('💰 [PayPal] Error: PayPal client not configured');
            throw new common_1.InternalServerErrorException('PayPal is not configured');
        }
        try {
            console.log('💰 [PayPal] Looking for payment record with orderId:', orderId);
            let payment = await this.paymentRepository.findOne({
                where: { paypalOrderId: orderId, userId },
            });
            if (!payment) {
                throw new common_1.BadRequestException('Payment record not found');
            }
            payment.status = payment_entity_1.PaymentStatusEnum.PROCESSING;
            await this.paymentRepository.save(payment);
            const request = new paypal.orders.OrdersCaptureRequest(orderId);
            request.requestBody({});
            const capture = await this.paypalClient.execute(request);
            console.log('💰 [PayPal] Capture response:', { status: capture.result.status, captureId: capture.result.id });
            if (capture.result.status === 'COMPLETED') {
                console.log('💰 [PayPal] Payment completed successfully');
                const purchaseUnit = capture.result.purchase_units?.[0];
                const listingId = purchaseUnit?.invoice_id || payment.listingId;
                const captureId = capture.result.id;
                payment.status = payment_entity_1.PaymentStatusEnum.COMPLETED;
                payment.paypalCaptureId = captureId || null;
                payment.listingId = listingId || payment.listingId;
                payment.metadata = {
                    ...payment.metadata,
                    paypalOrder: capture.result,
                };
                await this.paymentRepository.save(payment);
                this.paymentLogsService.logPaymentConfirmed({
                    userId: payment.userId,
                    paymentId: payment.id,
                    listingId: listingId || undefined,
                    amount: payment.amount,
                    currency: payment.currency,
                    provider: 'paypal',
                    status: payment.status,
                    metadata: { paypalOrderId: orderId, paypalCaptureId: captureId },
                });
                if (listingId) {
                    try {
                        console.log('💰 [PayPal] Updating listing paymentId:', { listingId, paymentId: payment.id });
                        await this.listingRepository
                            .createQueryBuilder()
                            .update(listing_entity_1.Listing)
                            .set({ paymentId: payment.id })
                            .where('id = :listingId', { listingId })
                            .execute();
                        console.log('💰 [PayPal] Listing paymentId updated successfully');
                    }
                    catch (updateError) {
                        console.error('💰 [PayPal] Error updating listing paymentId:', updateError);
                    }
                }
                return {
                    success: true,
                    listingId: listingId || payment.listingId || undefined,
                    paymentId: payment.id,
                };
            }
            payment.status = payment_entity_1.PaymentStatusEnum.FAILED;
            payment.metadata = {
                ...payment.metadata,
                errorMessage: 'Payment capture failed',
                paypalOrder: capture.result,
            };
            await this.paymentRepository.save(payment);
            this.paymentLogsService.logPaymentFailed({
                userId: payment.userId,
                paymentId: payment.id,
                listingId: payment.listingId || undefined,
                amount: payment.amount,
                currency: payment.currency,
                provider: 'paypal',
                error: new Error('Payment capture failed'),
                metadata: { orderId, paypalCaptureId: capture.result.id },
            });
            throw new common_1.BadRequestException('Payment capture failed');
        }
        catch (error) {
            try {
                const payment = await this.paymentRepository.findOne({
                    where: { paypalOrderId: orderId, userId },
                });
                if (payment) {
                    payment.status = payment_entity_1.PaymentStatusEnum.FAILED;
                    payment.metadata = {
                        ...payment.metadata,
                        errorMessage: error.message || 'Payment capture failed',
                    };
                    await this.paymentRepository.save(payment);
                }
            }
            catch (updateError) {
                console.error('Error updating payment record:', updateError);
            }
            console.error('💰 [PayPal] Error capturing PayPal payment:', error);
            throw new common_1.BadRequestException(error.message || 'Failed to capture payment');
        }
    }
    async getPaymentById(paymentId, userId) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId, userId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        return payment;
    }
    async getUserPayments(userId) {
        const payments = await this.paymentRepository.find({
            where: { userId },
            relations: ['listing'],
            order: { createdAt: 'DESC' },
        });
        return payments;
    }
    async getUserPaymentsWithStripeSync(userId) {
        const dbPayments = await this.getUserPayments(userId);
        if (!this.stripe) {
            console.warn('Stripe not configured, returning database payments only');
            return dbPayments;
        }
        try {
            const user = await this.listingRepository.manager
                .getRepository('users')
                .findOne({ where: { id: userId } });
            if (!user?.email) {
                return dbPayments;
            }
            const customers = await this.stripe.customers.list({
                email: user.email,
                limit: 1,
            });
            if (customers.data.length === 0) {
                return dbPayments;
            }
            const customerId = customers.data[0].id;
            const allPaymentIntents = [];
            let hasMorePaymentIntents = true;
            let paymentIntentStartingAfter = undefined;
            while (hasMorePaymentIntents) {
                const paymentIntentsResponse = await this.stripe.paymentIntents.list({
                    customer: customerId,
                    limit: 100,
                    ...(paymentIntentStartingAfter && { starting_after: paymentIntentStartingAfter }),
                });
                allPaymentIntents.push(...paymentIntentsResponse.data);
                hasMorePaymentIntents = paymentIntentsResponse.has_more;
                if (paymentIntentsResponse.data.length > 0) {
                    paymentIntentStartingAfter = paymentIntentsResponse.data[paymentIntentsResponse.data.length - 1].id;
                }
            }
            const allCharges = [];
            let hasMoreCharges = true;
            let chargeStartingAfter = undefined;
            while (hasMoreCharges) {
                const chargesResponse = await this.stripe.charges.list({
                    customer: customerId,
                    limit: 100,
                    ...(chargeStartingAfter && { starting_after: chargeStartingAfter }),
                });
                allCharges.push(...chargesResponse.data);
                hasMoreCharges = chargesResponse.has_more;
                if (chargesResponse.data.length > 0) {
                    chargeStartingAfter = chargesResponse.data[chargesResponse.data.length - 1].id;
                }
            }
            const allInvoices = [];
            let hasMoreInvoices = true;
            let invoiceStartingAfter = undefined;
            while (hasMoreInvoices) {
                const invoicesResponse = await this.stripe.invoices.list({
                    customer: customerId,
                    limit: 100,
                    ...(invoiceStartingAfter && { starting_after: invoiceStartingAfter }),
                });
                allInvoices.push(...invoicesResponse.data);
                hasMoreInvoices = invoicesResponse.has_more;
                if (invoicesResponse.data.length > 0) {
                    invoiceStartingAfter = invoicesResponse.data[invoicesResponse.data.length - 1].id;
                }
            }
            const paymentMap = new Map();
            dbPayments.forEach(payment => {
                if (payment.paymentIntentId) {
                    paymentMap.set(payment.paymentIntentId, payment);
                }
            });
            for (const pi of allPaymentIntents) {
                if (pi.metadata?.userId !== userId)
                    continue;
                const existingPayment = paymentMap.get(pi.id);
                if (!existingPayment && pi.status === 'succeeded') {
                    try {
                        const charge = allCharges.find(c => c.payment_intent === pi.id);
                        const payment = this.paymentRepository.create({
                            userId,
                            listingId: pi.metadata?.listingId || null,
                            paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                            status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
                            amount: pi.amount / 100,
                            currency: pi.currency.toUpperCase(),
                            paymentIntentId: pi.id,
                            paymentMethodId: typeof pi.payment_method === 'string'
                                ? pi.payment_method
                                : pi.payment_method?.id || null,
                            listingType: pi.metadata?.listingType || null,
                            isFeatured: pi.metadata?.includesFeatured === 'true',
                            metadata: {
                                stripePaymentIntent: pi,
                                stripeCharge: charge,
                                syncedFromStripe: true,
                            },
                        });
                        const savedPayment = await this.paymentRepository.save(payment);
                        paymentMap.set(pi.id, savedPayment);
                        console.log('✅ [Payments] Synced payment from Stripe:', savedPayment.id);
                    }
                    catch (error) {
                        console.error('❌ [Payments] Error syncing payment from Stripe:', error);
                    }
                }
            }
            for (const invoice of allInvoices) {
                if (invoice.status !== 'paid')
                    continue;
                const paymentIntentId = invoice.payment_intent;
                let existingPayment = paymentIntentId ? paymentMap.get(paymentIntentId) : null;
                if (!existingPayment && invoice.charge) {
                    const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id;
                    existingPayment = Array.from(paymentMap.values()).find(p => p.metadata?.stripeCharge?.id === chargeId) || null;
                }
                if (!existingPayment) {
                    try {
                        const subscriptionId = invoice.subscription;
                        let listingType = null;
                        let includesFeatured = false;
                        let listingId = null;
                        if (subscriptionId) {
                            const subscription = await this.listingRepository.manager
                                .getRepository('subscriptions')
                                .findOne({ where: { subscriptionId } });
                            if (subscription) {
                                listingType = subscription.listingType;
                                includesFeatured = subscription.includesFeatured;
                                listingId = subscription.listingId;
                            }
                            else if (invoice.metadata?.listingType) {
                                listingType = invoice.metadata.listingType;
                                includesFeatured = invoice.metadata.includesFeatured === 'true';
                            }
                        }
                        const charge = invoice.charge
                            ? (typeof invoice.charge === 'string'
                                ? allCharges.find(c => c.id === invoice.charge)
                                : invoice.charge)
                            : allCharges.find(c => (paymentIntentId && c.payment_intent === paymentIntentId) ||
                                c.invoice === invoice.id);
                        const uniqueId = paymentIntentId || invoice.id;
                        let paymentMethodId = null;
                        if (charge) {
                            paymentMethodId = typeof charge.payment_method === 'string'
                                ? charge.payment_method
                                : charge.payment_method?.id || null;
                        }
                        const payment = this.paymentRepository.create({
                            userId,
                            listingId: listingId,
                            paymentMethod: payment_entity_1.PaymentMethodEnum.STRIPE,
                            status: payment_entity_1.PaymentStatusEnum.SUCCEEDED,
                            amount: invoice.amount_paid / 100,
                            currency: invoice.currency.toUpperCase(),
                            paymentIntentId: paymentIntentId || null,
                            paymentMethodId: paymentMethodId,
                            listingType: listingType,
                            isFeatured: includesFeatured,
                            metadata: {
                                stripeInvoice: invoice,
                                stripeCharge: charge,
                                stripeSubscriptionId: subscriptionId,
                                billingReason: invoice.billing_reason,
                                syncedFromStripe: true,
                                invoiceId: invoice.id,
                            },
                        });
                        const savedPayment = await this.paymentRepository.save(payment);
                        if (paymentIntentId) {
                            paymentMap.set(paymentIntentId, savedPayment);
                        }
                        else {
                            paymentMap.set(`invoice_${invoice.id}`, savedPayment);
                        }
                        console.log('✅ [Payments] Synced subscription payment from Stripe invoice:', savedPayment.id, {
                            invoiceId: invoice.id,
                            subscriptionId,
                            amount: invoice.amount_paid / 100,
                        });
                    }
                    catch (error) {
                        console.error('❌ [Payments] Error syncing invoice payment from Stripe:', error);
                    }
                }
            }
            return Array.from(paymentMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        catch (error) {
            console.error('❌ [Payments] Error syncing with Stripe:', error);
            return dbPayments;
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(2, (0, typeorm_1.InjectRepository)(listing_entity_1.Listing)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        payment_logs_service_1.PaymentLogsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map