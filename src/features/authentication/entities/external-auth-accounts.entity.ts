// import { User } from "../../accounts/entities/account.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'external_auth_accounts' })
export class ExternalAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  provider: string;

  @Column({ type: 'varchar', length: 255 })
  externalId: string;

  @Column({ type: 'jsonb' })
  raw: Record<string, unknown>;

  @ManyToOne('User', (user: any) => user.externalAccounts)
  @JoinColumn({ name: 'userId' })
  user?: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: string;
}
