import { ExternalAuthAccount } from 'src/features/authentication/entities/external-auth-accounts.entity';
import { Listing } from 'src/features/listings/entities/listing.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserStatusEnum = 'not_verified' | 'suspended' | 'active';

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

  @Column({ type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  hashedPassword?: string;

  @OneToMany(
    () => ExternalAuthAccount,
    (externalAccount) => externalAccount.user,
  )
  externalAccounts: ExternalAuthAccount[];

  @OneToMany(() => Listing, (listing) => listing.user)
  listings: Listing[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: string;
}
