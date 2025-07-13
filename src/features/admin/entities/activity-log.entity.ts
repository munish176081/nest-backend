import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../accounts/entities/account.entity';

export enum ActivityTypeEnum {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_STATUS_CHANGED = 'user_status_changed',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_EVENT = 'system_event',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_ACTIVATED = 'account_activated',
  LISTING_CREATED = 'listing_created',
  LISTING_UPDATED = 'listing_updated',
  LISTING_DELETED = 'listing_deleted',
  MEETING_CREATED = 'meeting_created',
  MEETING_UPDATED = 'meeting_updated',
  MEETING_CANCELLED = 'meeting_cancelled',
}

export enum ActivityLevelEnum {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ActivityTypeEnum,
  })
  type: ActivityTypeEnum;

  @Column({
    type: 'enum',
    enum: ActivityLevelEnum,
    default: ActivityLevelEnum.INFO,
  })
  level: ActivityLevelEnum;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  resourceType: string;

  // Actor (who performed the action)
  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorEmail: string;

  @Column({ nullable: true })
  actorRole: string;

  // Target (who the action was performed on)
  @Column({ nullable: true })
  targetId: string;

  @Column({ nullable: true })
  targetEmail: string;

  @Column({ nullable: true })
  targetType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetId' })
  target: User;
} 