import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../accounts/entities/account.entity';
import { Listing } from '../../listings/entities/listing.entity';

@Entity('wishlist')
@Unique(['userId', 'listingId'])
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  listingId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listingId' })
  listing: Listing;
}
