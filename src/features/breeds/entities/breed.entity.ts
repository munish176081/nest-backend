import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';

@Entity({ name: 'breeds' })
// Partial unique indexes to allow duplicates only when previous row is soft-deleted
@Index('UQ_breeds_name_not_deleted', ['name'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('UQ_breeds_slug_not_deleted', ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['category'])
@Index(['isActive'])
@Index(['sortOrder'])
export class Breed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string; // e.g., 'toy', 'sporting', 'herding', 'working', 'terrier', 'hound', 'companion'

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string; // e.g., 'small', 'medium', 'large', 'giant'

  @Column({ type: 'text', nullable: true })
  temperament: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lifeExpectancy: string; // e.g., "10-12 years"

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string; // URL to the breed image

  // TODO: Auto-calculated fields for later implementation
  // @Column({ type: 'int', default: 0 })
  // listingCount: number;
  
  // @Column({ type: 'int', default: 0 })
  // viewCount: number;
  
  // @Column({ type: 'int', default: 0 })
  // favoriteCount: number;
  
  // @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  // popularityScore: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;

  // Relationships
  @OneToMany(() => Listing, (listing) => listing.breed)
  listings: Listing[];
} 