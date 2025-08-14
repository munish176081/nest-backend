// Test script to verify upload file key consistency
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testUploadFileKey() {
  try {
    console.log('🧪 Testing upload file key consistency...');
    
    // Get the most recent upload
    const result = await pool.query(`
      SELECT id, "uploadId", "fileName", "finalUrl", "fileKey", "chunkUrls"
      FROM uploads 
      WHERE "finalUrl" IS NOT NULL 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No uploads found to test');
      return;
    }
    
    const upload = result.rows[0];
    console.log(`📋 Testing upload: ${upload.uploadId}`);
    console.log(`📁 File name: ${upload.fileName}`);
    console.log(`🔑 Stored file key: ${upload.fileKey}`);
    console.log(`🌐 Final URL: ${upload.finalUrl}`);
    
    // Extract file key from final URL
    const url = new URL(upload.finalUrl);
    const pathParts = url.pathname.split('/');
    pathParts.shift(); // Remove empty string
    pathParts.shift(); // Remove 'uploads'
    const urlFileKey = pathParts.join('/');
    
    console.log(`🔍 Extracted file key from URL: ${urlFileKey}`);
    
    // Check if they match
    if (upload.fileKey === urlFileKey) {
      console.log('✅ File keys match! The fix is working.');
    } else {
      console.log('❌ File keys do not match!');
      console.log(`   Database: ${upload.fileKey}`);
      console.log(`   URL:      ${urlFileKey}`);
    }
    
    // Check chunk URLs if available
    if (upload.chunkUrls && upload.chunkUrls.length > 0) {
      console.log('\n🔍 Checking chunk URLs...');
      upload.chunkUrls.forEach((chunkUrl, index) => {
        const chunkUrlObj = new URL(chunkUrl);
        const chunkPathParts = chunkUrlObj.pathname.split('/');
        chunkPathParts.shift(); // Remove empty string
        chunkPathParts.shift(); // Remove 'pups4sale'
        const chunkFileKey = chunkPathParts.join('/');
        
        console.log(`   Chunk ${index}: ${chunkFileKey}`);
        
        if (upload.fileKey === chunkFileKey) {
          console.log(`   ✅ Chunk ${index} file key matches`);
        } else {
          console.log(`   ❌ Chunk ${index} file key does not match`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing upload file key:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testUploadFileKey();
