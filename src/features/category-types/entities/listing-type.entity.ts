
import { ListingAd } from 'src/features/marketplace-ads/entities/listing-ad.entity';
import { Listing } from 'src/features/marketplace/entities/product.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

export const listingTypes = [
  'puppy',
  'semen',
  'stud_bitch',
  'future',
  'wanted_puppy',
  'other',
] as const;

export type ListingTypeEnum = (typeof listingTypes)[number];

export const listingTypeEnumName = 'listing_type_enum';

export interface ListingProduct {
  price: number;
  durationInDays: number;
  title?: string;
  description?: string;
  imageUrls?: string[];
}

@Entity({ name: 'listing_types' })
export class ListingType {
  @PrimaryColumn('varchar', {
    length: 32,
  })
  type: ListingTypeEnum;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: [] })
  imageUrls: string[];

  @Column({ type: 'jsonb' })
  products: ListingProduct[];

  @OneToMany(() => Listing, (listing) => listing.listingType)
  listings: Listing[];

  @OneToMany(() => ListingAd, (ad) => ad.listing)
  ads: ListingAd[];
}
