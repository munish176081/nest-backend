export interface ISignedUrlResponse {
  uploadUrl: string;
  uploadId: string;
  chunkKey: string;
  expiresAt: Date;
}

export interface IUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkIndex: number;
  totalChunks: number;
  fileType: string;
  uploadId?: string;
  metadata?: Record<string, any>;
}

export interface ICompleteUploadRequest {
  uploadId: string;
  fileName: string;
  totalSize: number;
  chunkUrls: string[];
  finalUrl?: string;
  metadata?: Record<string, any>;
}

export interface IR2Service {
  generateSignedUrl(request: IUploadRequest): Promise<ISignedUrlResponse>;
  completeUpload(request: ICompleteUploadRequest): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  getFileUrl(fileKey: string): Promise<string>;
} 