import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BlogCategory } from './blog-category.entity';
import { User } from '../../accounts/entities/account.entity';

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity({ name: 'blog_posts' })
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  content: string; // Rich text content with HTML

  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  authorImage?: string;

  @Column({ type: 'varchar', length: 500 })
  featuredImage: string;

  @Column({ type: 'json', nullable: true })
  images?: string[]; // Additional images array

  @Column({ type: 'boolean', default: false })
  flipImage: boolean; // For the -scale-x-100 effect

  @Column({ type: 'enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT })
  status: BlogPostStatus;

  @Column({ type: 'json', nullable: true })
  tags: string[]; // Array of tags for search and related posts

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  @Column({ type: 'json', nullable: true })
  metaKeywords?: string[];

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @ManyToOne(() => BlogCategory, (category) => category.posts, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: BlogCategory;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
