import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LISTING = 'listing',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversation_id: string;

  @Column()
  sender_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  message_type: MessageType;

  @Column({ nullable: true })
  reply_to: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  listing_reference: {
    listingId: string;
    title: string;
    price: number;
    image: string;
    location: string;
    fields?: Record<string, any>;
  };

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: 'text', array: true, default: [] })
  read_by: string[];

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Message, { nullable: true })
  replyToMessage: Message;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation: Conversation;
} 