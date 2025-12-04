export declare enum FileTypeEnum {
    IMAGE = "image",
    VIDEO = "video",
    DOCUMENT = "document"
}
export declare class ListingFile {
    id: string;
    listingId: string;
    fileName: string;
    fileUrl: string;
    fileType: FileTypeEnum;
    fieldName: string;
    fileSize: number;
    mimeType: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
