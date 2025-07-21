import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';

@Injectable()
export class UploadRepository {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
  ) {}

  async create(uploadData: Partial<Upload>): Promise<Upload> {
    const upload = this.uploadRepository.create(uploadData);
    return await this.uploadRepository.save(upload);
  }

  async findById(id: string): Promise<Upload | null> {
    return await this.uploadRepository.findOne({ where: { id } });
  }

  async findByUploadId(uploadId: string): Promise<Upload | null> {
    return await this.uploadRepository.findOne({ where: { uploadId } });
  }

  async findByFinalUrl(finalUrl: string): Promise<Upload | null> {
    return await this.uploadRepository.findOne({ where: { finalUrl } });
  }

  async findByUrlPattern(urlPattern: string): Promise<Upload[]> {
    return await this.uploadRepository
      .createQueryBuilder('upload')
      .where('upload.finalUrl LIKE :urlPattern', { urlPattern: `%${urlPattern}%` })
      .getMany();
  }

  async findByUserId(userId: string): Promise<Upload[]> {
    return await this.uploadRepository.find({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async update(id: string, updateData: Partial<Upload>): Promise<Upload | null> {
    await this.uploadRepository.update(id, updateData);
    return await this.findById(id);
  }

  async updateByUploadId(uploadId: string, updateData: Partial<Upload>): Promise<Upload | null> {
    await this.uploadRepository.update({ uploadId }, updateData);
    return await this.findByUploadId(uploadId);
  }

  async delete(id: string): Promise<void> {
    await this.uploadRepository.delete(id);
  }

  async findPendingUploads(): Promise<Upload[]> {
    return await this.uploadRepository.find({ 
      where: { status: 'pending' },
      order: { createdAt: 'ASC' }
    });
  }

  async findCompletedUploads(): Promise<Upload[]> {
    return await this.uploadRepository.find({ 
      where: { status: 'completed' },
      order: { createdAt: 'DESC' }
    });
  }

  async findAll(): Promise<Upload[]> {
    return await this.uploadRepository.find({
      order: { createdAt: 'DESC' }
    });
  }
} 