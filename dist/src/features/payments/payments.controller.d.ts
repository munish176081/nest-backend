import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreateStripeIntentDto, ConfirmStripePaymentDto, CreatePayPalOrderDto, CapturePayPalPaymentDto } from './dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createStripeIntent(req: Request, createIntentDto: CreateStripeIntentDto): Promise<{
        clientSecret: string;
        paymentId: string;
    }>;
    confirmStripePayment(req: Request, confirmPaymentDto: ConfirmStripePaymentDto): Promise<{
        success: boolean;
        listingId?: string;
        paymentId: string;
    }>;
    createPayPalOrder(req: Request, createOrderDto: CreatePayPalOrderDto): Promise<{
        orderId: string;
        paymentId: string;
    }>;
    capturePayPalPayment(req: Request, capturePaymentDto: CapturePayPalPaymentDto): Promise<{
        success: boolean;
        listingId?: string;
        paymentId: string;
    }>;
    getUserPayments(req: Request, res: Response, sync?: string): Promise<Response<any, Record<string, any>>>;
    getPaymentById(req: Request, id: string): Promise<import("./entities/payment.entity").Payment>;
}
