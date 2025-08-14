const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixUploadFileKeys() {
  try {
    console.log('🔧 Starting upload file key fix...');
    
    // Get all uploads that have a finalUrl but no fileKey
    const result = await pool.query(`
      SELECT id, "uploadId", "fileName", "finalUrl", "fileKey"
      FROM uploads 
      WHERE "finalUrl" IS NOT NULL 
      AND ("fileKey" IS NULL OR "fileKey" = '')
    `);
    
    console.log(`📊 Found ${result.rows.length} uploads to fix`);
    
    if (result.rows.length === 0) {
      console.log('✅ No uploads need fixing');
      return;
    }
    
    let updatedCount = 0;
    
    for (const upload of result.rows) {
      try {
        // Extract the file key from the finalUrl
        // URL format: https://cdn.pups4sale.com.au/uploads/images/2025/08/1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg
        const url = new URL(upload.finalUrl);
        const pathParts = url.pathname.split('/');
        
        // Remove the first empty element and 'uploads'
        pathParts.shift(); // Remove empty string
        pathParts.shift(); // Remove 'uploads'
        
        // The remaining parts form the file key
        const fileKey = pathParts.join('/');
        
        // Update the upload record
        await pool.query(`
          UPDATE uploads 
          SET "fileKey" = $1 
          WHERE id = $2
        `, [fileKey, upload.id]);
        
        console.log(`✅ Fixed upload ${upload.id}: ${fileKey}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to fix upload ${upload.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully fixed ${updatedCount} out of ${result.rows.length} uploads`);
    
  } catch (error) {
    console.error('❌ Error fixing upload file keys:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixUploadFileKeys();
