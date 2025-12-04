import { User } from '../../accounts/entities/account.entity';
import { Listing } from '../../listings/entities/listing.entity';
export declare enum SubscriptionStatusEnum {
    ACTIVE = "active",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    PAST_DUE = "past_due",
    TRIALING = "trialing",
    INCOMPLETE = "incomplete",
    INCOMPLETE_EXPIRED = "incomplete_expired",
    UNPAID = "unpaid"
}
export declare enum SubscriptionPaymentMethodEnum {
    STRIPE = "stripe",
    PAYPAL = "paypal"
}
export declare class Subscription {
    id: string;
    userId: string;
    listingId: string | null;
    subscriptionId: string;
    paymentMethod: SubscriptionPaymentMethodEnum;
    status: SubscriptionStatusEnum;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    amount: number;
    currency: string;
    listingType: string | null;
    includesFeatured: boolean;
    metadata: {
        stripeSubscription?: any;
        paypalSubscription?: any;
        paymentMethodId?: string;
        customerId?: string;
        errorMessage?: string;
        [key: string]: any;
    };
    user: User;
    listing: Listing | null;
    createdAt: Date;
    updatedAt: Date;
}
