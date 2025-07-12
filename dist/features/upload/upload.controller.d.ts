import { UploadService } from './upload.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    requestUploadUrl(dto: RequestUploadUrlDto, req: any): Promise<{
        uploadUrl: string;
        uploadId: string;
        chunkKey: string;
        expiresAt: Date;
    }>;
    completeUpload(dto: CompleteUploadDto, req: any): Promise<{
        uploadId: string;
        finalUrl: string;
        status: string;
    }>;
    getUserUploads(req: any): Promise<import(".").Upload[]>;
    deleteUpload(uploadId: string, req: any): Promise<void>;
    requestPublicUploadUrl(dto: RequestUploadUrlDto): Promise<{
        uploadUrl: string;
        uploadId: string;
        chunkKey: string;
        expiresAt: Date;
    }>;
    completePublicUpload(dto: CompleteUploadDto): Promise<{
        uploadId: string;
        finalUrl: string;
        status: string;
    }>;
}
