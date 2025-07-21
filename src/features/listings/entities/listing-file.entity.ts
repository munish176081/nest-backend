import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Listing } from './listing.entity';

export enum FileTypeEnum {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

@Entity({ name: 'listing_files' })
export class ListingFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @JoinColumn({ name: 'listingId' })
  listingId: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ type: 'varchar', length: 100 })
  fileType: FileTypeEnum;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fieldName: string; // e.g., 'semenImages', 'puppyImages', 'healthCertificates'

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relationships
  // Temporarily commented out to avoid schema conflicts
  // @ManyToOne(() => Listing, (listing) => listing.files, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'listingId' })
  // listing: Listing;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 