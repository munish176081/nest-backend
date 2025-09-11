import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Participant } from './participant.entity';
import { Message } from './message.entity';
import { Listing } from '../../listings/entities/listing.entity';

export enum ConversationType {
  DIRECT = 'direct',
  LISTING = 'listing',
  SUPPORT = 'support',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  subject: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  conversation_type: ConversationType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  listing_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    subject?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    listingDetails?: {
      id: string;
      title: string;
      price: number;
      location: string;
      breed: string;
      fields?: Record<string, any>;
    };
    participants?: {
      buyer?: {
        id: string;
        name: string;
        joinedPlatform: string | Date;
      };
      seller?: {
        id: string;
        name: string;
        joinedPlatform: string | Date;
      };
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Participant, (participant) => participant.conversation, {
    cascade: true,
  })
  participants: Participant[];

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @ManyToOne(() => Message, { nullable: true })
  lastMessage: Message;

  @ManyToOne(() => Listing, { nullable: true })
  listing: Listing;
} 