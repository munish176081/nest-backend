import { Listing } from 'src/modules/listings/entities/listing.entity';
import { ColumnNumericTransformer } from 'src/utils/typeOrmColumnNumericTransformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const listingOrderStatuses = ['active', 'finished'] as const;

export type ListingOrderStatusEnum = (typeof listingOrderStatuses)[number];

@Entity({ name: 'listing_orders' })
export class ListingOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  listingId: string;

  @Column('varchar', { length: 32, default: 'active' })
  status: ListingOrderStatusEnum;

  @Column('numeric', { transformer: new ColumnNumericTransformer() })
  price: number;

  @Column('int2')
  durationInDays: number;

  @Column('varchar', { length: 255 })
  payment: string;

  @Column('uuid', { nullable: true })
  renewedByOrderId?: string;

  @Column('timestamptz')
  startsAt: Date;

  @Column('timestamptz')
  endsAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: string;

  // relations
  @ManyToOne(() => Listing, (listing) => listing.orders)
  listing: Listing;

  @OneToOne(() => ListingOrder, { nullable: true })
  @JoinColumn({ name: 'renewed_by_order_id' })
  renewsOrder: ListingOrder;

  @OneToOne(() => ListingOrder, (order) => order.renewsOrder)
  renewedBy: ListingOrder;
}
