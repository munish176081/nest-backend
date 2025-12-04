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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLogsService = exports.PaymentLogEventType = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
var PaymentLogEventType;
(function (PaymentLogEventType) {
    PaymentLogEventType["PAYMENT_CREATED"] = "PAYMENT_CREATED";
    PaymentLogEventType["PAYMENT_CONFIRMED"] = "PAYMENT_CONFIRMED";
    PaymentLogEventType["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    PaymentLogEventType["SUBSCRIPTION_CREATED"] = "SUBSCRIPTION_CREATED";
    PaymentLogEventType["SUBSCRIPTION_RENEWED"] = "SUBSCRIPTION_RENEWED";
    PaymentLogEventType["SUBSCRIPTION_CANCELLED"] = "SUBSCRIPTION_CANCELLED";
    PaymentLogEventType["SUBSCRIPTION_UPDATED"] = "SUBSCRIPTION_UPDATED";
    PaymentLogEventType["WEBHOOK_RECEIVED"] = "WEBHOOK_RECEIVED";
    PaymentLogEventType["WEBHOOK_PROCESSED"] = "WEBHOOK_PROCESSED";
    PaymentLogEventType["PAYMENT_METHOD_UPDATED"] = "PAYMENT_METHOD_UPDATED";
    PaymentLogEventType["ERROR"] = "ERROR";
})(PaymentLogEventType || (exports.PaymentLogEventType = PaymentLogEventType = {}));
let PaymentLogsService = class PaymentLogsService {
    constructor(configService) {
        this.configService = configService;
        const logDir = this.configService.get('PAYMENT_LOGS_DIR') || (0, path_1.join)(process.cwd(), 'logs');
        this.logFilePath = (0, path_1.join)(logDir, 'payment-logs.log');
        if (!(0, fs_1.existsSync)(logDir)) {
            (0, fs_1.mkdirSync)(logDir, { recursive: true });
        }
        if (!(0, fs_1.existsSync)(this.logFilePath)) {
            (0, fs_1.writeFileSync)(this.logFilePath, JSON.stringify({
                timestamp: new Date().toISOString(),
                eventType: 'SYSTEM',
                message: 'Payment logs initialized',
            }) + '\n', 'utf-8');
        }
    }
    log(entry) {
        try {
            const logEntry = {
                ...entry,
                timestamp: entry.timestamp || new Date().toISOString(),
            };
            const logLine = JSON.stringify(logEntry) + '\n';
            (0, fs_1.appendFileSync)(this.logFilePath, logLine, 'utf-8');
        }
        catch (error) {
            console.error('Failed to write payment log:', error);
            console.error('Log entry:', entry);
        }
    }
    logPaymentCreated(data) {
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
    logPaymentConfirmed(data) {
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
    logPaymentFailed(data) {
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
    logSubscriptionCreated(data) {
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
    logSubscriptionRenewed(data) {
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
    logSubscriptionCancelled(data) {
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
    logSubscriptionUpdated(data) {
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
    logWebhookReceived(data) {
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
    logWebhookProcessed(data) {
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
    logPaymentMethodUpdated(data) {
        this.log({
            eventType: PaymentLogEventType.PAYMENT_METHOD_UPDATED,
            userId: data.userId,
            subscriptionId: data.subscriptionId,
            paymentId: data.paymentId,
            provider: data.provider,
            metadata: data.metadata,
        });
    }
    logError(data) {
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
};
exports.PaymentLogsService = PaymentLogsService;
exports.PaymentLogsService = PaymentLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaymentLogsService);
//# sourceMappingURL=payment-logs.service.js.map