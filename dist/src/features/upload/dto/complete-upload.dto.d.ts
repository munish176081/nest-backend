export declare class CompleteUploadDto {
    uploadId: string;
    fileName: string;
    totalSize: number;
    chunkUrls: string[];
    finalUrl?: string;
    metadata?: string;
}
