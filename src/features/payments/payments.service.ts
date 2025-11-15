import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentStatusEnum, PaymentMethodEnum } from './entities/payment.entity';

// PayPal SDK doesn't have proper ES6 exports, use require
const paypal = require('@paypal/checkout-server-sdk');

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private paypalClient: any; // PayPalHttpClient type from @paypal/checkout-server-sdk

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    // Initialize Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY not found in environment variables');
    } else {
      // Stripe will use the latest compatible API version by default
      this.stripe = new Stripe(stripeSecretKey);
    }

    // Initialize PayPal
    const paypalClientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const paypalClientSecret = this.configService.get<string>('PAYPAL_SECRET');
    const paypalEnvironment = this.configService.get<string>('PAYPAL_ENVIRONMENT') || 'sandbox';

    if (paypalClientId && paypalClientSecret) {
      const environment = paypalEnvironment === 'production'
        ? new paypal.core.LiveEnvironment(paypalClientId, paypalClientSecret)
        : new paypal.core.SandboxEnvironment(paypalClientId, paypalClientSecret);
      
      this.paypalClient = new paypal.core.PayPalHttpClient(environment);
    } else {
      console.warn('PayPal credentials not found in environment variables');
    }
  }

  async createStripePaymentIntent(
    amount: number,
    listingType: string,
    userId: string,
    listingId?: string,
  ): Promise<{ clientSecret: string; paymentId: string }> {
    // Comprehensive userId validation
    if (!userId || userId === null || userId === undefined || userId === 'null' || userId === 'undefined' || (typeof userId === 'string' && userId.trim() === '')) {
      console.error('Invalid userId in createStripePaymentIntent:', {
        userId,
        userIdType: typeof userId,
        listingType,
        amount,
      });
      throw new BadRequestException('User ID is required and must be valid. Please log in again.');
    }
    
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount, // Amount is already in cents
        currency: 'usd',
        metadata: {
          userId,
          listingType,
          ...(listingId && { listingId }),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create payment record in database
      // Final validation before creating payment entity
      const validatedUserId = String(userId).trim();
      if (!validatedUserId || validatedUserId === 'null' || validatedUserId === 'undefined' || validatedUserId === '') {
        console.error('Invalid userId when creating payment record:', { 
          userId, 
          validatedUserId,
          listingType, 
          amount,
          userIdType: typeof userId,
        });
        throw new BadRequestException('Invalid user ID. Please log in again.');
      }

      console.log('Creating payment record with userId:', validatedUserId);

      // Create payment entity with explicit userId
      const paymentData = {
        userId: validatedUserId,
        listingId: listingId || null,
        paymentMethod: PaymentMethodEnum.STRIPE,
        status: PaymentStatusEnum.PENDING,
        amount: amount / 100, // Convert from cents to dollars
        currency: 'USD',
        paymentIntentId: paymentIntent.id,
        listingType,
        metadata: {
          stripePaymentIntent: paymentIntent,
        },
      };

      console.log('Payment data before create:', JSON.stringify({ ...paymentData, metadata: '...' }));

      const payment = this.paymentRepository.create(paymentData);
      
      // Explicitly set userId again after create to ensure it's set
      if (!payment.userId || payment.userId !== validatedUserId) {
        payment.userId = validatedUserId;
        console.log('Explicitly set userId on payment object:', payment.userId);
      }

      // Final validation: ensure payment object has userId before saving
      if (!payment.userId || payment.userId === null || payment.userId === undefined || payment.userId === 'null' || payment.userId === 'undefined' || String(payment.userId).trim() === '') {
        console.error('Payment object missing userId before save:', {
          payment: JSON.stringify(payment),
          validatedUserId,
          userId,
        });
        throw new BadRequestException('Payment record is missing user ID. Please log in again.');
      }

      console.log('Saving payment with userId:', payment.userId, 'payment object:', JSON.stringify({ userId: payment.userId, paymentIntentId: payment.paymentIntentId }));

      try {
        // Use insert() instead of save() to avoid relationship issues with @ManyToOne
        // This ensures the userId column is set directly without TypeORM trying to handle the relationship
        // Serialize paymentIntent to plain object for metadata
        const paymentIntentData = JSON.parse(JSON.stringify(paymentIntent));
        
        const insertResult = await this.paymentRepository
          .createQueryBuilder()
          .insert()
          .into(Payment)
          .values({
            userId: validatedUserId,
            listingId: listingId || null,
            paymentMethod: PaymentMethodEnum.STRIPE,
            status: PaymentStatusEnum.PENDING,
            amount: amount / 100,
            currency: 'USD',
            paymentIntentId: paymentIntent.id,
            listingType,
            metadata: {
              stripePaymentIntent: paymentIntentData,
            },
          })
          .returning('*')
          .execute();

        // The raw result uses snake_case column names from the database
        const rawPayment = insertResult.raw[0];
        const savedPayment = {
          id: rawPayment.id,
          userId: rawPayment.user_id || rawPayment.userId, // Handle both snake_case and camelCase
          listingId: rawPayment.listing_id || rawPayment.listingId,
          paymentMethod: rawPayment.payment_method || rawPayment.paymentMethod,
          status: rawPayment.status,
          amount: rawPayment.amount,
          currency: rawPayment.currency,
          paymentIntentId: rawPayment.payment_intent_id || rawPayment.paymentIntentId,
          listingType: rawPayment.listing_type || rawPayment.listingType,
          metadata: rawPayment.metadata,
        } as Payment;
        
        console.log('Payment saved successfully with id:', savedPayment.id, 'userId:', savedPayment.userId);
        
        return {
          clientSecret: paymentIntent.client_secret!,
          paymentId: savedPayment.id,
        };
      } catch (saveError: any) {
        console.error('Error saving payment to database:', {
          error: saveError,
          errorMessage: saveError.message,
          errorCode: saveError.code,
          paymentUserId: payment.userId,
          validatedUserId,
          originalUserId: userId,
        });
        
        // Check if it's a constraint violation
        if (saveError.message && saveError.message.includes('userId') && saveError.message.includes('not-null')) {
          throw new BadRequestException('User ID is missing. Please log in again and try again.');
        }
        
        throw saveError;
      }
    } catch (error: any) {
      console.error('Error creating Stripe payment intent:', error);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error.message || 'Failed to create payment intent',
      );
    }
  }

  async confirmStripePayment(
    paymentIntentId: string,
    paymentMethodId: string,
    userId: string,
  ): Promise<{ success: boolean; listingId?: string; paymentId: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required to confirm a payment');
    }
    
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      // Verify the payment intent belongs to the user
      if (paymentIntent.metadata.userId !== userId) {
        throw new BadRequestException('Payment intent does not belong to user');
      }

      // Find existing payment record
      let payment = await this.paymentRepository.findOne({
        where: { paymentIntentId, userId },
      });

      if (!payment) {
        // Validate userId before creating payment record
        const validatedUserId = String(userId).trim();
        if (!validatedUserId || validatedUserId === 'null' || validatedUserId === 'undefined' || validatedUserId === '') {
          console.error('Invalid userId in confirmStripePayment backward compatibility:', {
            userId,
            validatedUserId,
            paymentIntentId,
          });
          throw new BadRequestException('Invalid user ID. Please log in again.');
        }

        // Create payment record if it doesn't exist (for backward compatibility)
        payment = this.paymentRepository.create({
          userId: validatedUserId,
          paymentMethod: PaymentMethodEnum.STRIPE,
          status: PaymentStatusEnum.PROCESSING,
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

        // Final validation before save
        if (!payment.userId || String(payment.userId).trim() === '') {
          console.error('Payment object missing userId in confirmStripePayment:', payment);
          throw new BadRequestException('Payment record is missing user ID.');
        }

        payment = await this.paymentRepository.save(payment);
      } else {
        // Update existing payment record
        payment.paymentMethodId = paymentMethodId;
        payment.status = PaymentStatusEnum.PROCESSING;
        await this.paymentRepository.save(payment);
      }

      // Check if payment intent is already succeeded
      const paymentIntentStatus = paymentIntent.status as string;
      if (paymentIntentStatus === 'succeeded') {
        // Payment already succeeded, just update our record
        payment.status = PaymentStatusEnum.SUCCEEDED;
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

      // Only confirm if not already succeeded
      let confirmed = paymentIntent;
      if (paymentIntentStatus !== 'succeeded') {
        try {
          confirmed = await this.stripe.paymentIntents.confirm(
            paymentIntentId,
            {
              payment_method: paymentMethodId,
            },
          );
        } catch (confirmError: any) {
          // If already succeeded, just use the retrieved payment intent
          if (confirmError.code === 'payment_intent_unexpected_state' && paymentIntentStatus === 'succeeded') {
            confirmed = paymentIntent;
          } else {
            throw confirmError;
          }
        }
      }

      const confirmedStatus = confirmed.status as string;
      if (confirmedStatus === 'succeeded') {
        // Update payment record to succeeded
        payment.status = PaymentStatusEnum.SUCCEEDED;
        payment.metadata = {
          ...payment.metadata,
          stripePaymentIntent: confirmed,
        };
        await this.paymentRepository.save(payment);

        return {
          success: true,
          listingId: confirmed.metadata.listingId,
          paymentId: payment.id,
        };
      }

      // Update payment record to failed
      payment.status = PaymentStatusEnum.FAILED;
      payment.metadata = {
        ...payment.metadata,
        errorMessage: 'Payment confirmation failed',
        stripePaymentIntent: confirmed,
      };
      await this.paymentRepository.save(payment);

      throw new BadRequestException('Payment confirmation failed');
    } catch (error: any) {
      // Update payment record to failed if it exists
      try {
        const payment = await this.paymentRepository.findOne({
          where: { paymentIntentId, userId },
        });
        if (payment) {
          payment.status = PaymentStatusEnum.FAILED;
          payment.metadata = {
            ...payment.metadata,
            errorMessage: error.message || 'Payment failed',
          };
          await this.paymentRepository.save(payment);
        }
      } catch (updateError) {
        console.error('Error updating payment record:', updateError);
      }

      console.error('Error confirming Stripe payment:', error);
      throw new BadRequestException(
        error.message || 'Failed to confirm payment',
      );
    }
  }

  async createPayPalOrder(
    amount: number,
    listingType: string,
    userId: string,
    listingId?: string,
  ): Promise<{ orderId: string; paymentId: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required to create a payment');
    }
    
    if (!this.paypalClient) {
      throw new InternalServerErrorException('PayPal is not configured');
    }

    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
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

      // Create payment record in database
      // Double-check userId before creating payment
      if (!userId || userId === 'null' || userId === 'undefined') {
        console.error('Invalid userId when creating PayPal payment:', { userId, listingType, amount });
        throw new BadRequestException('Invalid user ID. Please log in again.');
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
        throw new BadRequestException('Invalid user ID. Please log in again.');
      }

      console.log('Creating PayPal payment record with userId:', validatedUserId);

      const payment = this.paymentRepository.create({
        userId: validatedUserId,
        listingId: listingId || null,
        paymentMethod: PaymentMethodEnum.PAYPAL,
        status: PaymentStatusEnum.PENDING,
        amount: parseFloat(amount.toFixed(2)),
        currency: 'USD',
        paypalOrderId: order.result.id!,
        listingType,
        metadata: {
          paypalOrder: order.result,
        },
      });

      // Final validation: ensure payment object has userId before saving
      if (!payment.userId || payment.userId === null || payment.userId === undefined || payment.userId === 'null' || payment.userId === 'undefined' || String(payment.userId).trim() === '') {
        console.error('PayPal payment object missing userId before save:', {
          payment: JSON.stringify(payment),
          validatedUserId,
          userId,
        });
        throw new BadRequestException('Payment record is missing user ID. Please log in again.');
      }

      console.log('Saving PayPal payment with userId:', payment.userId);

      // Use insert() instead of save() to avoid relationship issues with @ManyToOne
      const insertResult = await this.paymentRepository
        .createQueryBuilder()
        .insert()
        .into(Payment)
        .values({
          userId: validatedUserId,
          listingId: listingId || null,
          paymentMethod: PaymentMethodEnum.PAYPAL,
          status: PaymentStatusEnum.PENDING,
          amount: parseFloat(amount.toFixed(2)),
          currency: 'USD',
          paypalOrderId: order.result.id!,
          listingType,
          metadata: {
            paypalOrder: order.result,
          },
        })
        .returning('*')
        .execute();

      // The raw result uses snake_case column names from the database
      const rawPayment = insertResult.raw[0];
      const savedPayment = {
        id: rawPayment.id,
        userId: rawPayment.user_id || rawPayment.userId, // Handle both snake_case and camelCase
        listingId: rawPayment.listing_id || rawPayment.listingId,
        paymentMethod: rawPayment.payment_method || rawPayment.paymentMethod,
        status: rawPayment.status,
        amount: rawPayment.amount,
        currency: rawPayment.currency,
        paypalOrderId: rawPayment.paypal_order_id || rawPayment.paypalOrderId,
        listingType: rawPayment.listing_type || rawPayment.listingType,
        metadata: rawPayment.metadata,
      } as Payment;

      return {
        orderId: order.result.id!,
        paymentId: savedPayment.id,
      };
    } catch (error: any) {
      console.error('Error creating PayPal order:', error);
      throw new BadRequestException(
        error.message || 'Failed to create PayPal order',
      );
    }
  }

  async capturePayPalPayment(
    orderId: string,
    userId: string,
  ): Promise<{ success: boolean; listingId?: string; paymentId: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required to capture a payment');
    }
    
    if (!this.paypalClient) {
      throw new InternalServerErrorException('PayPal is not configured');
    }

    try {
      // Find existing payment record
      let payment = await this.paymentRepository.findOne({
        where: { paypalOrderId: orderId, userId },
      });

      if (!payment) {
        throw new BadRequestException('Payment record not found');
      }

      // Update payment status to processing
      payment.status = PaymentStatusEnum.PROCESSING;
      await this.paymentRepository.save(payment);

      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});

      const capture = await this.paypalClient.execute(request);

      if (capture.result.status === 'COMPLETED') {
        const purchaseUnit = capture.result.purchase_units?.[0];
        const listingId = purchaseUnit?.invoice_id;
        const captureId = capture.result.id;

        // Update payment record to completed
        payment.status = PaymentStatusEnum.COMPLETED;
        payment.paypalCaptureId = captureId || null;
        payment.listingId = listingId || payment.listingId;
        payment.metadata = {
          ...payment.metadata,
          paypalOrder: capture.result,
        };
        await this.paymentRepository.save(payment);

        return {
          success: true,
          listingId: listingId || payment.listingId || undefined,
          paymentId: payment.id,
        };
      }

      // Update payment record to failed
      payment.status = PaymentStatusEnum.FAILED;
      payment.metadata = {
        ...payment.metadata,
        errorMessage: 'Payment capture failed',
        paypalOrder: capture.result,
      };
      await this.paymentRepository.save(payment);

      throw new BadRequestException('Payment capture failed');
    } catch (error: any) {
      // Update payment record to failed if it exists
      try {
        const payment = await this.paymentRepository.findOne({
          where: { paypalOrderId: orderId, userId },
        });
        if (payment) {
          payment.status = PaymentStatusEnum.FAILED;
          payment.metadata = {
            ...payment.metadata,
            errorMessage: error.message || 'Payment capture failed',
          };
          await this.paymentRepository.save(payment);
        }
      } catch (updateError) {
        console.error('Error updating payment record:', updateError);
      }

      console.error('Error capturing PayPal payment:', error);
      throw new BadRequestException(
        error.message || 'Failed to capture payment',
      );
    }
  }
}

