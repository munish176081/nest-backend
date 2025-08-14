# Form Deletion Debugging Guide

## Current Issue
The delete media button is not deleting files from R2 when the form is saved. Files are marked for deletion in the UI but not actually deleted from R2.

## How the Deletion System Works

### 1. Soft Delete (UI Level)
- When user clicks delete button, files are marked for deletion in the UI
- Files appear with red styling and "Deleted" badge
- Files are removed from the form data but not from R2 yet
- This allows users to undo deletions before form submission

### 2. Hard Delete (Form Submission)
- When form is submitted, `deleteAllPendingFiles()` is called
- This function collects all pending deletions and calls the bulk delete API
- Files are then permanently deleted from R2

## Recent Fixes Applied

### 1. Fixed Frontend Endpoints
- Updated `useDeletePendingFiles` to use `/uploads/bulk-delete` instead of debug endpoint
- Updated `useDeleteUpload` to use `/uploads/by-url` instead of debug endpoint
- Updated `useBulkDeleteUpload` to use `/uploads/bulk-delete` instead of debug endpoint

### 2. Enhanced Backend
- Fixed `extractKeyFromUrl` method to properly handle CDN URLs
- Added comprehensive logging to R2Service delete operations
- Fixed bulk delete endpoint to return proper success/failure status
- Added proper bulk delete endpoint `/uploads/bulk-delete`

### 3. Added Debugging
- Added console logs to track deletion process
- Created test scripts to verify functionality

## Testing Steps

### 1. Test Individual File Deletion
```bash
# Run the delete functionality test
node test-delete-functionality.js
```

### 2. Test Form Deletion Process
```bash
# Run the form deletion test
node test-form-deletion.js
```

### 3. Test Frontend Deletion Flow
1. Upload a new file in the form
2. Click the delete button (X) next to the file
3. Verify the file is marked for deletion (red styling)
4. Submit the form
5. Check browser console for deletion logs
6. Verify the file is removed from R2

### 4. Test Bulk Deletion
1. Upload multiple files
2. Click "Clear All" button
3. Verify all files are marked for deletion
4. Submit the form
5. Check browser console for bulk deletion logs

## Debugging Console Logs

### Frontend Logs to Look For
- `📝 handlePendingDeletions called:` - When files are marked for deletion
- `📊 Updated pending deletions state:` - Shows the pending deletions state
- `🗑️ Attempting to delete pending files:` - When form submission starts deletion
- `🚀 Calling deletePendingFilesMutation with URLs:` - API call details
- `✅ Delete result:` - API response

### Backend Logs to Look For
- `Attempting to delete file:` - R2Service delete attempt
- `Extracted key from URL:` - Key extraction process
- `Sending delete command to R2:` - R2 API call
- `Successfully deleted file from R2:` - Successful deletion
- `Bulk delete completed:` - Bulk deletion summary

## Common Issues and Solutions

### Issue 1: Files not being marked for deletion
**Symptoms**: Delete button doesn't change file appearance
**Solution**: Check if `markForDeletion` function is being called

### Issue 2: Files marked but not deleted on form submission
**Symptoms**: Files disappear from UI but remain in R2
**Solution**: Check browser console for deletion logs and API errors

### Issue 3: Bulk delete API errors
**Symptoms**: Console shows API errors during form submission
**Solution**: Check if the bulk delete endpoint is working correctly

### Issue 4: Key extraction issues
**Symptoms**: Files not found in R2 during deletion
**Solution**: Run `test-delete-functionality.js` to verify key extraction

## API Endpoints

### Individual Delete
```
DELETE /uploads/by-url
Body: { fileUrl: string }
```

### Bulk Delete
```
POST /uploads/bulk-delete
Body: { fileUrls: string[] }
Response: { success: boolean, message: string, results: object }
```

## Monitoring

The system now includes comprehensive logging at all levels:
- Frontend: Console logs for UI interactions
- Backend: Detailed logs for API operations
- R2Service: Step-by-step deletion process logs

## Next Steps

1. **Deploy the fixes** - All endpoints should now work correctly
2. **Test the deletion flow** - Use the test scripts and frontend testing
3. **Monitor the logs** - Check both frontend and backend logs during testing
4. **Verify R2 cleanup** - Confirm files are actually removed from R2 storage
