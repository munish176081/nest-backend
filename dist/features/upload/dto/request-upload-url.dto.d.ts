export declare enum FileType {
    IMAGE = "image",
    VIDEO = "video",
    DOCUMENT = "document"
}
export declare class RequestUploadUrlDto {
    fileName: string;
    fileSize: number;
    mimeType: string;
    chunkIndex: number;
    totalChunks: number;
    fileType: FileType;
    uploadId?: string;
    metadata?: string;
}
