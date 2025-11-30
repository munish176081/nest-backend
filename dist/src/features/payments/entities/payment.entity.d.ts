import { User } from '../../accounts/entities/account.entity';
import { Listing } from '../../listings/entities/listing.entity';
export declare enum PaymentStatusEnum {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCEEDED = "succeeded",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum PaymentMethodEnum {
    STRIPE = "stripe",
    PAYPAL = "paypal"
}
export declare class Payment {
    id: string;
    userId: string;
    listingId: string | null;
    paymentMethod: PaymentMethodEnum;
    status: PaymentStatusEnum;
    amount: number;
    currency: string;
    paymentIntentId: string | null;
    paymentMethodId: string | null;
    paypalOrderId: string | null;
    paypalCaptureId: string | null;
    listingType: string | null;
    isFeatured: boolean;
    metadata: {
        stripePaymentIntent?: any;
        paypalOrder?: any;
        errorMessage?: string;
        [key: string]: any;
    };
    user: User;
    listing: Listing | null;
    createdAt: Date;
    updatedAt: Date;
}
