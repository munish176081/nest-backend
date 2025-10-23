import { User } from '../../accounts/entities/account.entity';
import { FileType } from '../dto/request-upload-url.dto';
export declare class Upload {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileType: FileType;
    uploadId: string;
    totalChunks: number;
    uploadedChunks: number;
    finalUrl: string;
    fileKey: string;
    chunkUrls: string[];
    metadata: Record<string, any>;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    userId: string;
    user: User;
    createdAt: Date;
    updatedAt: Date;
}
