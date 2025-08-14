const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testDeleteFunctionality() {
  try {
    console.log('🧪 Testing delete functionality...');
    
    // Get a recent upload to test deletion
    const result = await pool.query(`
      SELECT id, "uploadId", "fileName", "finalUrl", "fileKey"
      FROM uploads 
      WHERE "finalUrl" IS NOT NULL 
      AND "status" = 'completed'
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No completed uploads found to test deletion');
      return;
    }
    
    const upload = result.rows[0];
    console.log(`📋 Testing deletion for upload: ${upload.uploadId}`);
    console.log(`📁 File name: ${upload.fileName}`);
    console.log(`🔑 File key: ${upload.fileKey}`);
    console.log(`🌐 Final URL: ${upload.finalUrl}`);
    
    // Test the extractKeyFromUrl logic
    const url = new URL(upload.finalUrl);
    const pathname = url.pathname;
    const extractedKey = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    console.log(`🔍 Extracted key from URL: ${extractedKey}`);
    console.log(`🔍 Stored file key: ${upload.fileKey}`);
    
    if (extractedKey === upload.fileKey) {
      console.log('✅ Key extraction matches stored file key');
    } else {
      console.log('❌ Key extraction does not match stored file key');
      console.log(`   Extracted: ${extractedKey}`);
      console.log(`   Stored:    ${upload.fileKey}`);
    }
    
    // Test with a sample URL
    const sampleUrl = 'https://cdn.pups4sale.com.au/uploads/images/2025/08/1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg';
    const sampleUrlObj = new URL(sampleUrl);
    const samplePathname = sampleUrlObj.pathname;
    const sampleExtractedKey = samplePathname.startsWith('/') ? samplePathname.substring(1) : samplePathname;
    
    console.log(`\n🧪 Testing with sample URL: ${sampleUrl}`);
    console.log(`🔍 Sample extracted key: ${sampleExtractedKey}`);
    
    const expectedKey = 'uploads/images/2025/08/1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg';
    
    if (sampleExtractedKey === expectedKey) {
      console.log('✅ Sample key extraction is correct');
    } else {
      console.log('❌ Sample key extraction is incorrect');
      console.log(`   Expected: ${expectedKey}`);
      console.log(`   Got:      ${sampleExtractedKey}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing delete functionality:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDeleteFunctionality();
