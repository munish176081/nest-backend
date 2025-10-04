import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './account.entity';

export type ActivityLevelEnum = 'info' | 'warning' | 'error' | 'critical';
export type ActivityTypeEnum = 'user' | 'admin' | 'system' | 'listing' | 'meeting' | 'auth';

@Entity({ name: 'activity_logs' })
@Index(['type', 'level'])
@Index(['actorId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: ActivityTypeEnum;

  @Column({ type: 'varchar', length: 20 })
  level: ActivityLevelEnum;

  @Column({ type: 'varchar', length: 255 })
  action: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  resourceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resourceType: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  actorId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetEmail: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetType: string;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetId' })
  target: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
