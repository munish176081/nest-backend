import { ConfigService } from '@nestjs/config';
export declare enum PaymentLogEventType {
    PAYMENT_CREATED = "PAYMENT_CREATED",
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    SUBSCRIPTION_CREATED = "SUBSCRIPTION_CREATED",
    SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED",
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",
    SUBSCRIPTION_UPDATED = "SUBSCRIPTION_UPDATED",
    WEBHOOK_RECEIVED = "WEBHOOK_RECEIVED",
    WEBHOOK_PROCESSED = "WEBHOOK_PROCESSED",
    PAYMENT_METHOD_UPDATED = "PAYMENT_METHOD_UPDATED",
    ERROR = "ERROR"
}
export interface PaymentLogEntry {
    timestamp?: string;
    eventType: PaymentLogEventType;
    userId?: string;
    paymentId?: string;
    subscriptionId?: string;
    listingId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    provider?: 'stripe' | 'paypal';
    listingType?: string;
    metadata?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
}
export declare class PaymentLogsService {
    private configService;
    private logFilePath;
    constructor(configService: ConfigService);
    log(entry: PaymentLogEntry): void;
    logPaymentCreated(data: {
        userId: string;
        paymentId: string;
        listingId?: string;
        amount: number;
        currency: string;
        provider: 'stripe' | 'paypal';
        listingType?: string;
        metadata?: Record<string, any>;
    }): void;
    logPaymentConfirmed(data: {
        userId: string;
        paymentId: string;
        listingId?: string;
        amount: number;
        currency: string;
        provider: 'stripe' | 'paypal';
        status: string;
        metadata?: Record<string, any>;
    }): void;
    logPaymentFailed(data: {
        userId: string;
        paymentId?: string;
        listingId?: string;
        amount?: number;
        currency?: string;
        provider: 'stripe' | 'paypal';
        error: Error | {
            message: string;
            code?: string;
        };
        metadata?: Record<string, any>;
    }): void;
    logSubscriptionCreated(data: {
        userId: string;
        subscriptionId: string;
        listingId?: string;
        amount: number;
        currency: string;
        provider: 'stripe' | 'paypal';
        listingType?: string;
        includesFeatured?: boolean;
        metadata?: Record<string, any>;
    }): void;
    logSubscriptionRenewed(data: {
        userId: string;
        subscriptionId: string;
        listingId?: string;
        amount: number;
        currency: string;
        provider: 'stripe' | 'paypal';
        currentPeriodEnd: Date;
        metadata?: Record<string, any>;
    }): void;
    logSubscriptionCancelled(data: {
        userId: string;
        subscriptionId: string;
        listingId?: string;
        cancelAtPeriodEnd: boolean;
        provider: 'stripe' | 'paypal';
        metadata?: Record<string, any>;
    }): void;
    logSubscriptionUpdated(data: {
        userId: string;
        subscriptionId: string;
        listingId?: string;
        provider: 'stripe' | 'paypal';
        changes: Record<string, any>;
        metadata?: Record<string, any>;
    }): void;
    logWebhookReceived(data: {
        provider: 'stripe' | 'paypal';
        eventType: string;
        eventId: string;
        requestData?: Record<string, any>;
    }): void;
    logWebhookProcessed(data: {
        provider: 'stripe' | 'paypal';
        eventType: string;
        eventId: string;
        success: boolean;
        subscriptionId?: string;
        paymentId?: string;
        error?: Error;
        responseData?: Record<string, any>;
    }): void;
    logPaymentMethodUpdated(data: {
        userId: string;
        subscriptionId?: string;
        paymentId?: string;
        provider: 'stripe' | 'paypal';
        metadata?: Record<string, any>;
    }): void;
    logError(data: {
        userId?: string;
        paymentId?: string;
        subscriptionId?: string;
        provider?: 'stripe' | 'paypal';
        error: Error;
        context?: Record<string, any>;
    }): void;
}
