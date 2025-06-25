
import { ListingType, ListingTypeEnum } from 'src/features/category-types/entities/listing-type.entity';
import { ListingAdOrder } from 'src/features/marketplace-ad-orders/entities/listing-ad-order.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const listingAdTypes = ['home-page', 'featured', 'highlighted'] as const;

export type ListingAdTypeEnum = (typeof listingAdTypes)[number];

interface ListingAdProduct {
  price: number;
  durationInDays: number;
  title?: string;
  description?: string;
  imageUrls?: string[];
}

@Entity({ name: 'listing_ads' })
export class ListingAd {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('varchar', { length: 32 })
  adType: ListingAdTypeEnum;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  products: ListingAdProduct[];

  @Column('varchar', { length: 32 })
  listingType: ListingTypeEnum | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ListingType, (listingType) => listingType.ads)
  listing: ListingType;

  @OneToMany(() => ListingAdOrder, (order) => order.id)
  orders: ListingAdOrder[];
}
