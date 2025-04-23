import { ListingOrder } from 'src/modules/listing-orders/entities/listing-order.entity';
import {
  ListingType,
  ListingTypeEnum,
  listingTypeEnumName,
  listingTypes,
} from 'src/modules/listing-types/entities/listing-type.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ColumnNumericTransformer } from 'src/utils/typeOrmColumnNumericTransformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Point,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const listingStatuses = ['draft', 'active', 'expired'] as const;

export type ListingStatusEnum = (typeof listingStatuses)[number];

@Entity({ name: 'listings' })
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column('varchar', { length: 32, default: 'draft' })
  status: ListingStatusEnum;

  @Column('varchar', { length: 32 })
  type: ListingTypeEnum;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  breed: string;

  @Column('numeric', {
    transformer: new ColumnNumericTransformer(),
    nullable: true,
  })
  price: string;

  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;

  @Column({ type: 'jsonb' })
  fields: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: string;

  // relations
  @ManyToOne(() => User, (user) => user.listings)
  user: User;

  @ManyToOne(() => ListingType, (listingType) => listingType.listings)
  @JoinColumn({ name: 'type', referencedColumnName: 'type' })
  listingType: ListingType;

  @OneToMany(() => ListingOrder, (order) => order.listing)
  orders: ListingOrder[];
}
