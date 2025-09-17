export type PaymentMethod = 'card';
export type PaymentProvider = 'stripe';
export declare class Payment {
    readonly paymentMethod: PaymentMethod | string;
    readonly paymentId: string;
    readonly provider: PaymentProvider;
    urn(): string;
    static fromUrn(urn: string): Payment;
    constructor(paymentMethod: PaymentMethod | string, paymentId: string, provider?: PaymentProvider);
}
