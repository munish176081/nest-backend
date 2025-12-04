import { R2Service } from './r2.service';
import { UploadRepository } from './upload.repository';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { Upload } from './entities/upload.entity';
export declare class UploadService {
    private readonly r2Service;
    private readonly uploadRepository;
    private readonly logger;
    constructor(r2Service: R2Service, uploadRepository: UploadRepository);
    requestUploadUrl(dto: RequestUploadUrlDto, userId?: string): Promise<{
        uploadUrl: string;
        uploadId: string;
        chunkKey: string;
        expiresAt: Date;
    }>;
    completeUpload(dto: CompleteUploadDto, userId?: string): Promise<{
        uploadId: string;
        finalUrl: string;
        status: string;
    }>;
    getUserUploads(userId: string): Promise<Upload[]>;
    getAllUploads(): Promise<Upload[]>;
    deleteUpload(uploadId: string, userId?: string): Promise<void>;
    deleteUploadByUrl(fileUrl: string, userId?: string): Promise<void>;
    deleteMultipleUploadsByUrls(fileUrls: string[], userId?: string): Promise<{
        success: string[];
        failed: {
            url: string;
            error: string;
        }[];
    }>;
    private validateFileType;
    private validateFileSize;
}
