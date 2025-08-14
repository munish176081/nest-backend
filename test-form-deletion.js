const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testFormDeletion() {
  try {
    console.log('🧪 Testing form deletion process...');
    
    // Get recent uploads to understand the current state
    const result = await pool.query(`
      SELECT id, "uploadId", "fileName", "finalUrl", "fileKey", "status", "createdAt"
      FROM uploads 
      WHERE "finalUrl" IS NOT NULL 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    console.log(`📊 Found ${result.rows.length} recent uploads`);
    
    if (result.rows.length === 0) {
      console.log('❌ No uploads found to test');
      return;
    }
    
    console.log('\n📋 Recent uploads:');
    result.rows.forEach((upload, index) => {
      console.log(`${index + 1}. ${upload.fileName}`);
      console.log(`   URL: ${upload.finalUrl}`);
      console.log(`   Status: ${upload.status}`);
      console.log(`   Created: ${upload.createdAt}`);
      console.log('');
    });
    
    // Test the key extraction logic
    console.log('🔍 Testing key extraction:');
    const sampleUpload = result.rows[0];
    const url = new URL(sampleUpload.finalUrl);
    const pathname = url.pathname;
    const extractedKey = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    console.log(`   Original URL: ${sampleUpload.finalUrl}`);
    console.log(`   Extracted key: ${extractedKey}`);
    console.log(`   Stored key: ${sampleUpload.fileKey}`);
    
    if (extractedKey === sampleUpload.fileKey) {
      console.log('   ✅ Key extraction matches stored key');
    } else {
      console.log('   ❌ Key extraction does not match stored key');
    }
    
    // Test with the specific URL from the user's issue
    console.log('\n🔍 Testing with user\'s specific URL:');
    const userUrl = 'https://cdn.pups4sale.com.au/uploads/images/2025/08/1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg';
    const userUrlObj = new URL(userUrl);
    const userPathname = userUrlObj.pathname;
    const userExtractedKey = userPathname.startsWith('/') ? userPathname.substring(1) : userPathname;
    
    console.log(`   User URL: ${userUrl}`);
    console.log(`   Extracted key: ${userExtractedKey}`);
    
    const expectedKey = 'uploads/images/2025/08/1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg';
    
    if (userExtractedKey === expectedKey) {
      console.log('   ✅ User URL key extraction is correct');
    } else {
      console.log('   ❌ User URL key extraction is incorrect');
      console.log(`   Expected: ${expectedKey}`);
      console.log(`   Got:      ${userExtractedKey}`);
    }
    
    // Check if there are any uploads with the user's file pattern
    console.log('\n🔍 Checking for uploads with user\'s file pattern:');
    const userFilePattern = '1754633423792_1d0586e2-67e2-4e82-af0c-78db421e1104_banner-dog.svg';
    const patternResult = await pool.query(`
      SELECT id, "uploadId", "fileName", "finalUrl", "fileKey", "status"
      FROM uploads 
      WHERE "fileName" LIKE $1 OR "finalUrl" LIKE $1
    `, [`%${userFilePattern}%`]);
    
    console.log(`   Found ${patternResult.rows.length} uploads matching the pattern`);
    patternResult.rows.forEach((upload, index) => {
      console.log(`   ${index + 1}. ${upload.fileName} (${upload.status})`);
      console.log(`      URL: ${upload.finalUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing form deletion:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testFormDeletion();
