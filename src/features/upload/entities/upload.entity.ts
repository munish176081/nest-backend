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
import { FileType } from '../dto/request-upload-url.dto';

@Entity({ name: 'uploads' })
export class Upload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'enum', enum: FileType })
  fileType: FileType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadId: string;

  @Column({ type: 'int', default: 0 })
  totalChunks: number;

  @Column({ type: 'int', default: 0 })
  uploadedChunks: number;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  finalUrl: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  fileKey: string;

  @Column({ type: 'jsonb', nullable: true })
  chunkUrls: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'uploading' | 'completed' | 'failed';

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 