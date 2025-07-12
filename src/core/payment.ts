export type PaymentMethod = 'card';
export type PaymentProvider = 'stripe';

export class Payment {
  urn(): string {
    return `urn:pups4sale:payment:${this.provider}:${this.paymentMethod}:${this.paymentId}`;
  }

  static fromUrn(urn: string): Payment {
    const [_, provider, paymentMethod, paymentId] = urn.split(':');

    if (provider !== 'stripe') {
      throw new Error('Invalid payment provider');
    }

    return new Payment(paymentMethod, paymentId, provider);
  }

  constructor(
    public readonly paymentMethod: PaymentMethod | string = 'card',
    public readonly paymentId: string,
    public readonly provider: PaymentProvider = 'stripe',
  ) {}
}
