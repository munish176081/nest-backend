import { ListingAd } from 'src/modules/listing-ads/entities/listing-ad.entity';
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

export const listingAdOrderStatuses = ['active', 'finished'] as const;

export type ListingAdOrderStatusEnum = (typeof listingAdOrderStatuses)[number];

@Entity({ name: 'listing_ad_orders' })
export class ListingAdOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int')
  listingAdId: number;

  @Column('uuid')
  listingId: string;
  @Column('varchar', { length: 32, default: 'active' })
  status: ListingAdOrderStatusEnum;

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
  @ManyToOne(() => ListingAd, (listingAd) => listingAd.orders)
  listingAd: ListingAd;

  @ManyToOne(() => Listing, (listing) => listing.orders)
  listing: Listing;

  @OneToOne(() => ListingAdOrder, { nullable: true })
  @JoinColumn({ name: 'renewed_by_order_id' })
  renewsOrder: ListingAdOrder;

  @OneToOne(() => ListingAdOrder, (order) => order.renewsOrder)
  renewedBy: ListingAdOrder;
}
