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

export enum SubscriptionStatusEnum {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  UNPAID = 'unpaid',
}

export enum SubscriptionPaymentMethodEnum {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

@Entity({ name: 'subscriptions' })
@Index('idx_subscriptions_user_id', ['userId'])
@Index('idx_subscriptions_listing_id', ['listingId'])
@Index('idx_subscriptions_subscription_id', ['subscriptionId'])
@Index('idx_subscriptions_status', ['status'])
@Index('idx_subscriptions_current_period_end', ['currentPeriodEnd'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', nullable: true, name: 'listing_id' })
  listingId: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  subscriptionId: string; // Stripe subscription ID or PayPal subscription ID

  @Column({ type: 'enum', enum: SubscriptionPaymentMethodEnum })
  paymentMethod: SubscriptionPaymentMethodEnum;

  @Column({ type: 'enum', enum: SubscriptionStatusEnum, default: SubscriptionStatusEnum.ACTIVE })
  status: SubscriptionStatusEnum;

  @Column({ type: 'timestamptz', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'boolean', default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'canceled_at' })
  canceledAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'listing_type' })
  listingType: string | null;

  @Column({ type: 'boolean', default: false, name: 'includes_featured' })
  includesFeatured: boolean; // For Puppy Listings with featured add-on

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    stripeSubscription?: any;
    paypalSubscription?: any;
    paymentMethodId?: string;
    customerId?: string;
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

