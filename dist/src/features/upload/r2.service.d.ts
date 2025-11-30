import { ConfigService } from '@nestjs/config';
import { IR2Service, IUploadRequest, ISignedUrlResponse, ICompleteUploadRequest } from './interfaces/r2.interface';
export declare class R2Service implements IR2Service {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly region;
    constructor(configService: ConfigService);
    generateSignedUrl(request: IUploadRequest): Promise<ISignedUrlResponse>;
    completeUpload(request: ICompleteUploadRequest): Promise<string>;
    private getContentTypeFromFileName;
    deleteFile(fileUrl: string): Promise<void>;
    getFileUrl(fileKey: string): Promise<string>;
    private generateUniqueFileKey;
    private generateChunkKey;
    private generateFinalKey;
    private getFileTypeFolder;
    private extractKeyFromUrl;
}
