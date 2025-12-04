import { Repository } from 'typeorm';
import { Upload } from './entities/upload.entity';
export declare class UploadRepository {
    private readonly uploadRepository;
    constructor(uploadRepository: Repository<Upload>);
    create(uploadData: Partial<Upload>): Promise<Upload>;
    findById(id: string): Promise<Upload | null>;
    findByUploadId(uploadId: string): Promise<Upload | null>;
    findByFinalUrl(finalUrl: string): Promise<Upload | null>;
    findByUrlPattern(urlPattern: string): Promise<Upload[]>;
    findByUserId(userId: string): Promise<Upload[]>;
    update(id: string, updateData: Partial<Upload>): Promise<Upload | null>;
    updateByUploadId(uploadId: string, updateData: Partial<Upload>): Promise<Upload | null>;
    delete(id: string): Promise<void>;
    findPendingUploads(): Promise<Upload[]>;
    findCompletedUploads(): Promise<Upload[]>;
    findAll(): Promise<Upload[]>;
}
