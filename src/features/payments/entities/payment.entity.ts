import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../accounts/entities/account.entity';
import { Listing } from '../../listings/entities/listing.entity';

export enum PaymentStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethodEnum {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

@Entity({ name: 'payments' })
@Index('idx_payments_user_status', ['userId', 'status'])
@Index('idx_payments_listing_id', ['listingId'])
@Index('idx_payments_payment_intent_id', ['paymentIntentId'])
@Index('idx_payments_paypal_order_id', ['paypalOrderId'])
@Index('idx_payments_created_at', ['createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', nullable: true, name: 'listing_id' })
  listingId: string | null;

  @Column({ type: 'enum', enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: 'enum', enum: PaymentStatusEnum, default: PaymentStatusEnum.PENDING })
  status: PaymentStatusEnum;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // Stripe payment fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentIntentId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMethodId: string | null;

  // PayPal payment fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  paypalOrderId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paypalCaptureId: string | null;

  // Additional metadata
  @Column({ type: 'varchar', length: 100, nullable: true })
  listingType: string | null;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    stripePaymentIntent?: any;
    paypalOrder?: any;
    errorMessage?: string;
    [key: string]: any;
  };

  // Relationships
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Listing, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

