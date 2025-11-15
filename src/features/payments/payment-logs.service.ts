import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum PaymentLogEventType {
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  PAYMENT_METHOD_UPDATED = 'PAYMENT_METHOD_UPDATED',
  ERROR = 'ERROR',
}

export interface PaymentLogEntry {
  timestamp?: string; // Optional - will be added automatically if not provided
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

@Injectable()
export class PaymentLogsService {
  private logFilePath: string;

  constructor(private configService: ConfigService) {
    // Get log file path from config or use default
    const logDir = this.configService.get<string>('PAYMENT_LOGS_DIR') || join(process.cwd(), 'logs');
    this.logFilePath = join(logDir, 'payment-logs.log');

    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // Initialize log file with header if it doesn't exist
    if (!existsSync(this.logFilePath)) {
      writeFileSync(
        this.logFilePath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          eventType: 'SYSTEM',
          message: 'Payment logs initialized',
        }) + '\n',
        'utf-8'
      );
    }
  }

  /**
   * Log a payment or subscription event
   */
  log(entry: PaymentLogEntry): void {
    try {
      const logEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      appendFileSync(this.logFilePath, logLine, 'utf-8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write payment log:', error);
      console.error('Log entry:', entry);
    }
  }

  /**
   * Log payment creation
   */
  logPaymentCreated(data: {
    userId: string;
    paymentId: string;
    listingId?: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'paypal';
    listingType?: string;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.PAYMENT_CREATED,
      userId: data.userId,
      paymentId: data.paymentId,
      listingId: data.listingId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      listingType: data.listingType,
      metadata: data.metadata,
    });
  }

  /**
   * Log payment confirmation/success
   */
  logPaymentConfirmed(data: {
    userId: string;
    paymentId: string;
    listingId?: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'paypal';
    status: string;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.PAYMENT_CONFIRMED,
      userId: data.userId,
      paymentId: data.paymentId,
      listingId: data.listingId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      status: data.status,
      metadata: data.metadata,
    });
  }

  /**
   * Log payment failure
   */
  logPaymentFailed(data: {
    userId: string;
    paymentId?: string;
    listingId?: string;
    amount?: number;
    currency?: string;
    provider: 'stripe' | 'paypal';
    error: Error | { message: string; code?: string };
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.PAYMENT_FAILED,
      userId: data.userId,
      paymentId: data.paymentId,
      listingId: data.listingId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      error: {
        message: data.error.message,
        stack: data.error instanceof Error ? data.error.stack : undefined,
        code: 'code' in data.error ? data.error.code : undefined,
      },
      metadata: data.metadata,
    });
  }

  /**
   * Log subscription creation
   */
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
  }): void {
    this.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_CREATED,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      listingId: data.listingId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      listingType: data.listingType,
      metadata: {
        ...data.metadata,
        includesFeatured: data.includesFeatured,
      },
    });
  }

  /**
   * Log subscription renewal
   */
  logSubscriptionRenewed(data: {
    userId: string;
    subscriptionId: string;
    listingId?: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'paypal';
    currentPeriodEnd: Date;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_RENEWED,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      listingId: data.listingId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      metadata: {
        ...data.metadata,
        currentPeriodEnd: data.currentPeriodEnd.toISOString(),
      },
    });
  }

  /**
   * Log subscription cancellation
   */
  logSubscriptionCancelled(data: {
    userId: string;
    subscriptionId: string;
    listingId?: string;
    cancelAtPeriodEnd: boolean;
    provider: 'stripe' | 'paypal';
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_CANCELLED,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      listingId: data.listingId,
      provider: data.provider,
      metadata: {
        ...data.metadata,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });
  }

  /**
   * Log subscription update
   */
  logSubscriptionUpdated(data: {
    userId: string;
    subscriptionId: string;
    listingId?: string;
    provider: 'stripe' | 'paypal';
    changes: Record<string, any>;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.SUBSCRIPTION_UPDATED,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      listingId: data.listingId,
      provider: data.provider,
      metadata: {
        ...data.metadata,
        changes: data.changes,
      },
    });
  }

  /**
   * Log webhook received
   */
  logWebhookReceived(data: {
    provider: 'stripe' | 'paypal';
    eventType: string;
    eventId: string;
    requestData?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.WEBHOOK_RECEIVED,
      provider: data.provider,
      metadata: {
        webhookEventType: data.eventType,
        webhookEventId: data.eventId,
        requestData: data.requestData,
      },
    });
  }

  /**
   * Log webhook processed
   */
  logWebhookProcessed(data: {
    provider: 'stripe' | 'paypal';
    eventType: string;
    eventId: string;
    success: boolean;
    subscriptionId?: string;
    paymentId?: string;
    error?: Error;
    responseData?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.WEBHOOK_PROCESSED,
      provider: data.provider,
      subscriptionId: data.subscriptionId,
      paymentId: data.paymentId,
      error: data.error
        ? {
            message: data.error.message,
            stack: data.error.stack,
          }
        : undefined,
      metadata: {
        webhookEventType: data.eventType,
        webhookEventId: data.eventId,
        success: data.success,
        responseData: data.responseData,
      },
    });
  }

  /**
   * Log payment method update
   */
  logPaymentMethodUpdated(data: {
    userId: string;
    subscriptionId?: string;
    paymentId?: string;
    provider: 'stripe' | 'paypal';
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.PAYMENT_METHOD_UPDATED,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      paymentId: data.paymentId,
      provider: data.provider,
      metadata: data.metadata,
    });
  }

  /**
   * Log generic error
   */
  logError(data: {
    userId?: string;
    paymentId?: string;
    subscriptionId?: string;
    provider?: 'stripe' | 'paypal';
    error: Error;
    context?: Record<string, any>;
  }): void {
    this.log({
      eventType: PaymentLogEventType.ERROR,
      userId: data.userId,
      paymentId: data.paymentId,
      subscriptionId: data.subscriptionId,
      provider: data.provider,
      error: {
        message: data.error.message,
        stack: data.error.stack,
      },
      metadata: data.context,
    });
  }
}

