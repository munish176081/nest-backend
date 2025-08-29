import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  listingId: string;

  @Column()
  buyerId: string;

  @Column()
  sellerId: string;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  duration: number;

  @Column()
  timezone: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'expired'],
    default: 'pending'
  })
  status: string;

  @Column({ nullable: true })
  googleMeetLink?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
