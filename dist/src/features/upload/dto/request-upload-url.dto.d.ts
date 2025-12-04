export declare enum FileType {
    IMAGE = "image",
    BREED_IMAGE = "breed-image",
    BREED_TYPE_IMAGE = "breed-type-image",
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
