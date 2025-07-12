# R2 Chunked Upload System

This module implements a robust, chunked file upload system to Cloudflare R2 following SOLID principles.

## Architecture

### Components

1. **UploadController** - REST API endpoints for upload operations
2. **UploadService** - Business logic for upload management
3. **R2Service** - Cloudflare R2 integration using AWS SDK
4. **UploadRepository** - Database operations for upload tracking
5. **Upload Entity** - TypeORM entity for upload records

### SOLID Principles Implementation

- **Single Responsibility**: Each service has a single, well-defined purpose
- **Open/Closed**: Services are open for extension through interfaces
- **Liskov Substitution**: R2Service implements IR2Service interface
- **Interface Segregation**: Clean interfaces for each service
- **Dependency Inversion**: Services depend on abstractions, not concretions

## API Endpoints

### Authenticated Endpoints

- `POST /uploads/request-url` - Request signed URL for chunk upload
- `POST /uploads/complete` - Complete chunked upload
- `GET /uploads/my-uploads` - Get user's uploads
- `DELETE /uploads/:uploadId` - Delete upload

### Public Endpoints

- `POST /uploads/public/request-url` - Request signed URL for anonymous upload
- `POST /uploads/public/complete` - Complete anonymous upload

## Configuration

Add these environment variables:

```env
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

## Usage Flow

### 1. Request Upload URL

```typescript
const response = await fetch('/uploads/request-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'example.jpg',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    chunkIndex: 0,
    totalChunks: 3,
    fileType: 'image'
  })
});
```

### 2. Upload Chunk to R2

```typescript
const { uploadUrl } = await response.json();
await fetch(uploadUrl, {
  method: 'PUT',
  body: chunkBlob,
  headers: { 'Content-Type': 'image/jpeg' }
});
```

### 3. Complete Upload

```typescript
await fetch('/uploads/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId: 'upload-id',
    fileName: 'example.jpg',
    totalSize: 1024000,
    chunkUrls: ['url1', 'url2', 'url3']
  })
});
```

## File Type Support

- **Images**: JPEG, PNG, GIF, WebP (max 10MB)
- **Videos**: MP4, AVI, MOV, WMV (max 100MB)
- **Documents**: PDF, DOC, DOCX (max 50MB)

## Features

- ✅ Chunked uploads for large files
- ✅ Resume upload capability
- ✅ File type validation
- ✅ File size limits
- ✅ User authentication integration
- ✅ Anonymous uploads
- ✅ Upload progress tracking
- ✅ Cleanup on deletion
- ✅ Comprehensive error handling

## Database Schema

The `uploads` table tracks:
- Upload metadata (filename, size, type)
- Chunk information
- Upload status and progress
- User association
- Final file URLs

## Security

- Signed URLs with expiration
- File type validation
- Size limits enforcement
- User ownership validation
- Secure R2 credentials management

## Error Handling

- Invalid file types
- File size exceeded
- Upload session not found
- Authentication failures
- R2 service errors

## Monitoring

- Upload progress logging
- Error tracking
- Performance metrics
- User activity tracking 