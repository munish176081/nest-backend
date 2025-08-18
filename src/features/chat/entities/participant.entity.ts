import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum ParticipantRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Entity('participants')
// @Unique(['conversation_id', 'user_id']) // Temporarily removed to debug participant creation
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversation_id: string;

  @Column()
  user_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.BUYER,
  })
  role: ParticipantRole;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true })
  lastSeen: Date;

  @Column({ default: 0 })
  unreadCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
} 