"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
class Payment {
    urn() {
        return `urn:pups4sale:payment:${this.provider}:${this.paymentMethod}:${this.paymentId}`;
    }
    static fromUrn(urn) {
        const [_, provider, paymentMethod, paymentId] = urn.split(':');
        if (provider !== 'stripe') {
            throw new Error('Invalid payment provider');
        }
        return new Payment(paymentMethod, paymentId, provider);
    }
    constructor(paymentMethod = 'card', paymentId, provider = 'stripe') {
        this.paymentMethod = paymentMethod;
        this.paymentId = paymentId;
        this.provider = provider;
    }
}
exports.Payment = Payment;
//# sourceMappingURL=payment.js.map