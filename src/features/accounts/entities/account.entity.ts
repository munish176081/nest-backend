// import { ExternalAuthAccount } from '../../authentication/entities/external-auth-accounts.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserStatusEnum = 'not_verified' | 'suspended' | 'active';
export type UserRoleEnum = 'user' | 'admin' | 'super_admin';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 256, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 32, default: 'not_verified' })
  status: UserStatusEnum;

  @Column({ type: 'varchar', length: 32, default: 'user' })
  role: UserRoleEnum;

  @Column({ type: 'boolean', default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  website?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  businessName?: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  businessABN?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  location?: string;

  @Column({ type: 'jsonb', nullable: true })
  idVerification?: {
    governmentId: string[];
    selfieWithId: string[];
  };

  // CSV Import fields
  @Column({ type: 'varchar', length: 256, nullable: true })
  email2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fax?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  address2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zip?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  lastName?: string;

  // CSV Import tracking flags
  @Column({ type: 'boolean', default: false })
  isImportedFromCsv: boolean;

  @Column({ type: 'boolean', default: false })
  isProfileComplete: boolean;

  @Column({ type: 'jsonb', nullable: true })
  missingRequiredFields?: string[];

  @Column({ type: 'jsonb', nullable: true })
  csvOptionalFields?: Record<string, any>;

  @Column({ type: 'varchar', length: 256, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  hashedPassword?: string;

  @OneToMany(
    'ExternalAuthAccount',
    (externalAccount: any) => externalAccount.user,
  )
  externalAccounts: any[];

  @OneToMany('Listing', (listing: any) => listing.user)
  listings: any[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: string;
}
