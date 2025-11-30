import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateStripeSubscriptionDto, CreatePayPalSubscriptionDto, UpdateSubscriptionDto, CancelSubscriptionDto, UpdatePaymentMethodDto } from './dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    createStripeSubscription(req: Request, createDto: CreateStripeSubscriptionDto): Promise<{
        subscriptionId: string;
        clientSecret?: string;
    }>;
    createPayPalSubscription(req: Request, createDto: CreatePayPalSubscriptionDto): Promise<{
        subscriptionId: string;
        approvalUrl: string;
    }>;
    getUserSubscriptions(req: Request, sync?: string): Promise<import("./entities/subscription.entity").Subscription[]>;
    checkActiveSubscription(req: Request, listingType: string): Promise<{
        hasSubscription: boolean;
        subscription?: import("./entities/subscription.entity").Subscription;
    }>;
    getSubscriptionById(req: Request, id: string): Promise<import("./entities/subscription.entity").Subscription>;
    confirmSubscriptionPayment(req: Request, id: string): Promise<import("./entities/subscription.entity").Subscription>;
    cancelSubscription(req: Request, id: string, cancelDto: CancelSubscriptionDto): Promise<import("./entities/subscription.entity").Subscription>;
    updateSubscription(req: Request, id: string, updateDto: UpdateSubscriptionDto): Promise<import("./entities/subscription.entity").Subscription>;
    getPaymentMethod(req: Request, id: string): Promise<{
        paymentMethod: import("./entities/subscription.entity").SubscriptionPaymentMethodEnum;
        paymentMethodId: string;
        customerId: string;
    }>;
    updatePaymentMethod(req: Request, id: string, updateDto: UpdatePaymentMethodDto): Promise<import("./entities/subscription.entity").Subscription>;
    syncPayPalSubscription(req: Request, id: string): Promise<import("./entities/subscription.entity").Subscription>;
}
