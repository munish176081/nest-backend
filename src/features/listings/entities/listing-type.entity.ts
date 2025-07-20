import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Listing } from './listing.entity';

@Entity({ name: 'listing_types' })
export class ListingType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'jsonb' })
  requiredFields: Record<string, any>[];

  @Column({ type: 'jsonb' })
  optionalFields: Record<string, any>[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 30 })
  defaultExpirationDays: number;

  // Relationships
  // Temporarily commented out to avoid schema conflicts
  // @OneToMany(() => Listing, (listing) => listing.listingType)
  // listings: Listing[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 