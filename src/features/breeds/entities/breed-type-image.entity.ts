import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'breed_type_images' })
@Index(['category'])
@Index(['isActive'])
export class BreedTypeImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  category: string; // e.g., 'toy', 'sporting', 'herding', 'working', 'terrier', 'hound', 'companion'

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string; // URL to the breed type image

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string; // Display title for the category

  @Column({ type: 'text', nullable: true })
  description: string; // Description for the category

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
