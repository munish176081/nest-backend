import { UploadService } from './upload.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { DeleteUploadByUrlDto } from './dto/delete-upload-by-url.dto';
export declare class UploadController {
    private readonly uploadService;
    private readonly logger;
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
    getAllUploads(): Promise<import(".").Upload[]>;
    testDelete(body: {
        fileUrl: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: any;
        error: any;
    }>;
    bulkDeleteUploads(body: {
        fileUrls: string[];
    }, req: any): Promise<{
        success: boolean;
        message: string;
        results: {
            success: string[];
            failed: {
                url: string;
                error: string;
            }[];
        };
    }>;
    deleteUpload(uploadId: string, req: any): Promise<void>;
    deleteUploadByUrl(dto: DeleteUploadByUrlDto, req: any): Promise<void>;
    proxyImage(imageUrl: string, res: any): Promise<any>;
    proxyTest(res: any): Promise<void>;
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
