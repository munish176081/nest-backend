# Upload File Key Fix

## Issue Description

The upload system was experiencing a timestamp mismatch issue where:
- Database records were saved with one timestamp (e.g., `1754633421740`)
- Actual files on CDN had a different timestamp (e.g., `1754633423792`)

This caused images to not display because the database URL didn't match the actual file location.

## Root Cause

The `generateUniqueFileKey` method in `R2Service` was being called multiple times with different timestamps:
1. **First call**: During `generateSignedUrl` for the first chunk (when upload URL is requested)
2. **Subsequent calls**: During `generateSignedUrl` for additional chunks (each with new timestamps)
3. **Final call**: During `completeUpload` (when upload is finalized)

Each call generated a new timestamp using `Date.now()`, creating different file keys for the same upload.

## Solution

### 1. Database Schema Update
- Added `fileKey` column to the `uploads` table
- This column stores the file key generated during the initial upload request

### 2. Code Changes

#### Upload Entity (`upload.entity.ts`)
- Added `fileKey` field to store the generated file key

#### Upload Service (`upload.service.ts`)
- Modified `requestUploadUrl` to:
  - Store the `fileKey` in the database when creating a new upload
  - Pass the stored `fileKey` to R2Service for subsequent chunk uploads
- Modified `completeUpload` to pass the stored `fileKey` to R2Service

#### R2 Service (`r2.service.ts`)
- Modified `generateSignedUrl` to use the provided `fileKey` instead of generating a new one
- Modified `completeUpload` to use the provided `fileKey` instead of generating a new one
- Added logging to track which file key is being used

#### Interface Update (`r2.interface.ts`)
- Added `fileKey` parameter to both `IUploadRequest` and `ICompleteUploadRequest` interfaces

### 3. Backward Compatibility
- The system maintains backward compatibility by generating a new file key if none is provided
- This ensures existing uploads continue to work

## Deployment Steps

### 1. Deploy Code Changes
```bash
# Deploy the updated code
git add .
git commit -m "Fix upload file key timestamp mismatch for all chunks"
git push
```

### 2. Restart Application
The database schema will be automatically updated when the application restarts due to `synchronize: true` in TypeORM configuration.

### 3. Fix Existing Uploads (Optional)
Run the fix script to update existing uploads:

```bash
# Set environment variables
export DATABASE_URL="your_database_url"
export NODE_ENV="production"  # or "development"

# Run the fix script
node fix-upload-filekeys.js
```

### 4. Test the Fix
Run the test script to verify the fix is working:

```bash
# Test the fix
node test-upload-fix.js
```

## Testing

### 1. Test New Uploads
- Upload a new image
- Verify the database `fileKey` matches the CDN file path
- Confirm the image displays correctly
- Check that all chunk URLs use the same file key

### 2. Test Existing Uploads
- Check if existing images display correctly after running the fix script
- Verify the `fileKey` column is populated for existing uploads

## Monitoring

The system now includes comprehensive logging to help debug future issues:
- R2Service logs which file key is being used for both signed URLs and completion
- UploadService logs the file key storage and retrieval
- Test script available to verify file key consistency

## Prevention

This fix ensures that:
- File keys are generated only once during the initial upload request
- The same file key is used consistently for all chunks of the same upload
- The same file key is used for the final completion
- Future uploads will not experience the timestamp mismatch issue
