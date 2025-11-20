import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PaymentLogsService } from './payment-logs.service';
export declare class PaymentsService {
    private configService;
    private paymentRepository;
    private listingRepository;
    private paymentLogsService;
    private stripe;
    private paypalClient;
    constructor(configService: ConfigService, paymentRepository: Repository<Payment>, listingRepository: Repository<Listing>, paymentLogsService: PaymentLogsService);
    createStripePaymentIntent(amount: number, listingType: string, userId: string, listingId?: string): Promise<{
        clientSecret: string;
        paymentId: string;
    }>;
    confirmStripePayment(paymentIntentId: string, paymentMethodId: string, userId: string): Promise<{
        success: boolean;
        listingId?: string;
        paymentId: string;
    }>;
    createPayPalOrder(amount: number, listingType: string, userId: string, listingId?: string): Promise<{
        orderId: string;
        paymentId: string;
    }>;
    capturePayPalPayment(orderId: string, userId: string): Promise<{
        success: boolean;
        listingId?: string;
        paymentId: string;
    }>;
    getPaymentById(paymentId: string, userId: string): Promise<Payment>;
    getUserPayments(userId: string): Promise<Payment[]>;
    getUserPaymentsWithStripeSync(userId: string): Promise<Payment[]>;
}
