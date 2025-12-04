import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatusEnum } from './entities/subscription.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PaymentLogsService } from '../payments/payment-logs.service';
import { Payment } from '../payments/entities/payment.entity';
export declare class SubscriptionsService {
    private configService;
    private subscriptionRepository;
    private listingRepository;
    private paymentRepository;
    private paymentLogsService;
    private stripe;
    private paypalClient;
    private stripePriceIds;
    private paypalPlanIds;
    constructor(configService: ConfigService, subscriptionRepository: Repository<Subscription>, listingRepository: Repository<Listing>, paymentRepository: Repository<Payment>, paymentLogsService: PaymentLogsService);
    private getSubscriptionPricing;
    createStripeSubscription(userId: string, listingType: string, paymentMethodId?: string, listingId?: string, includesFeatured?: boolean): Promise<{
        subscriptionId: string;
        clientSecret?: string;
    }>;
    createPayPalSubscription(userId: string, listingType: string, listingId?: string, includesFeatured?: boolean): Promise<{
        subscriptionId: string;
        approvalUrl: string;
    }>;
    getUserSubscriptions(userId: string, syncFromStripe?: boolean): Promise<Subscription[]>;
    hasActiveSubscriptionForListingType(userId: string, listingType: string): Promise<{
        hasSubscription: boolean;
        subscription?: Subscription;
    }>;
    syncSubscriptionsFromStripe(userId: string): Promise<void>;
    getSubscriptionById(subscriptionId: string, userId?: string): Promise<Subscription>;
    cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd?: boolean): Promise<Subscription>;
    updateSubscription(subscriptionId: string, userId: string, includesFeatured: boolean): Promise<Subscription>;
    updatePaymentMethod(subscriptionId: string, userId: string, paymentMethodId: string): Promise<Subscription>;
    updateSubscriptionStatus(providerSubscriptionId: string, status: SubscriptionStatusEnum, currentPeriodStart?: Date, currentPeriodEnd?: Date, cancelAtPeriodEnd?: boolean, metadata?: Record<string, any>): Promise<Subscription>;
    handleSubscriptionRenewal(providerSubscriptionId: string, amount: number, currency: string): Promise<void>;
    private mapStripeStatusToSubscriptionStatus;
    private mapPayPalStatusToSubscriptionStatus;
    syncPayPalSubscriptionStatus(subscriptionId: string, userId: string): Promise<Subscription>;
    private getPayPalAccessToken;
    private paypalApiRequest;
    confirmSubscriptionPayment(subscriptionId: string, userId: string): Promise<Subscription>;
}
