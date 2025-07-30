import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../accounts/entities/account.entity';
import { Breed } from '../../breeds/entities/breed.entity';
// Temporarily commented out to avoid schema conflicts
// import { ListingFile } from './listing-file.entity';
// import { ListingType } from './listing-type.entity';

export enum ListingTypeEnum {
  SEMEN_LISTING = 'SEMEN_LISTING',
  PUPPY_LISTING = 'PUPPY_LISTING',
  STUD_LISTING = 'STUD_LISTING',
  FUTURE_LISTING = 'FUTURE_LISTING',
  WANTED_LISTING = 'WANTED_LISTING',
  OTHER_SERVICES = 'OTHER_SERVICES',
}

export enum ListingStatusEnum {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum ListingCategoryEnum {
  BREEDING = 'breeding',
  PUPPY = 'puppy',
  SERVICE = 'service',
  WANTED = 'wanted',
}

export enum ListingAvailabilityEnum {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD_OUT = 'sold_out',
  DRAFT = 'draft',
}

@Entity({ name: 'listings' })
@Index(['userId', 'status'])
@Index(['type', 'status'])
@Index(['category', 'status'])
@Index(['expiresAt'])
@Index(['createdAt'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  // Temporarily commented out to avoid schema conflicts
  // @Column({ type: 'uuid', nullable: true })
  // @Index()
  // listingTypeId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  type: ListingTypeEnum;

  @Column({ type: 'varchar', length: 50, default: ListingStatusEnum.DRAFT })
  @Index()
  status: ListingStatusEnum;

  @Column({ type: 'varchar', length: 50, default: ListingAvailabilityEnum.AVAILABLE })
  @Index()
  availability: ListingAvailabilityEnum;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  category: ListingCategoryEnum;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  fields: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    price?: number;
    breed?: string;
    location?: string;
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    images?: string[];
    videos?: string[];
    documents?: string[];
    motherImages?: string[];
    fatherImages?: string[];
    motherVideos?: string[];
    fatherVideos?: string[];
    tags?: string[];
    featured?: boolean;
    premium?: boolean;
    views?: number;
    favorites?: number;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  @Index('idx_listings_mother_info', { synchronize: false })
  motherInfo: {
    name?: string;
    breed?: string;
    color?: string;
    weight?: string;
    temperament?: string;
    healthInfo?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  @Index('idx_listings_father_info', { synchronize: false })
  fatherInfo: {
    name?: string;
    breed?: string;
    color?: string;
    weight?: string;
    temperament?: string;
    healthInfo?: string;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  breed: string; // Keep for backward compatibility

  @Column({ type: 'uuid', nullable: true })
  @Index()
  breedId: string; // New foreign key to breeds table

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  location: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamptz' })
  startedOrRenewedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt: Date;

  @Column({ type: 'text', nullable: true })
  suspensionReason: string;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  favoriteCount: number;

  @Column({ type: 'int', default: 0 })
  contactCount: number;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  seoData: {
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  analytics: {
    lastViewedAt?: Date;
    lastContactedAt?: Date;
    viewHistory?: Array<{
      date: Date;
      count: number;
    }>;
    contactHistory?: Array<{
      date: Date;
      count: number;
    }>;
  };

  // Relationships
  @ManyToOne(() => User, (user) => user.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Breed, { nullable: true })
  @JoinColumn({ name: 'breedId' })
  breedRelation: Breed;

  // Temporarily commented out to avoid schema conflicts
  // @ManyToOne(() => ListingType, (listingType) => listingType.listings, { nullable: true })
  // @JoinColumn({ name: 'listingTypeId' })
  // listingType: ListingType;

  // @OneToMany(() => ListingFile, (file) => file.listing, { cascade: true })
  // files: ListingFile[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 