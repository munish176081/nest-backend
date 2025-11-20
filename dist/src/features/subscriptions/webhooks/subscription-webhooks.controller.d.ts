import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../entities/subscription.entity';
import { PaymentLogsService } from '../../payments/payment-logs.service';
import { Listing } from '../../listings/entities/listing.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Repository } from 'typeorm';
export declare class SubscriptionWebhooksController {
    private configService;
    private subscriptionsService;
    private paymentLogsService;
    private listingRepository;
    private paymentRepository;
    private subscriptionRepository;
    private readonly logger;
    private stripe;
    constructor(configService: ConfigService, subscriptionsService: SubscriptionsService, paymentLogsService: PaymentLogsService, listingRepository: Repository<Listing>, paymentRepository: Repository<Payment>, subscriptionRepository: Repository<Subscription>);
    handleStripeWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    private handleSubscriptionCreated;
    private handleSubscriptionUpdated;
    private handleSubscriptionDeleted;
    private handlePaymentSucceeded;
    private handlePaymentFailed;
    private mapStripeStatus;
    private updateListingExpiration;
    handlePayPalWebhook(req: Request, headers: Record<string, string>): Promise<{
        received: boolean;
    }>;
    private handlePayPalSubscriptionCreated;
    private handlePayPalSubscriptionActivated;
    private handlePayPalSubscriptionCancelled;
    private handlePayPalSubscriptionUpdated;
    private handlePayPalPaymentCompleted;
    private handlePayPalPaymentFailed;
    private mapPayPalStatus;
}
