const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const R2_ACCESS_KEY_ID = '71e91ab86516305e944cb9bc77d31c24';
const R2_SECRET_ACCESS_KEY = '097607453d9493c91be772cdefe9e7509fdfd0020383643363789e626f0347c2';
const R2_BUCKET_NAME = 'pups4sale';
const R2_ENDPOINT = 'https://f39d03fb3077e6f5344c75ca8a99e220.r2.cloudflarestorage.com';

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(localFilePath, r2Key) {
  const fileContent = fs.readFileSync(localFilePath);

  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: fileContent,
    ContentType: 'image/jpeg',
  };

  try {
    const result = await s3.send(new PutObjectCommand(uploadParams));
    console.log('✅ Upload successful:', result);
  } catch (err) {
    console.error('❌ Upload failed:', err.message);
  }
}

uploadToR2('C:/Users/Sushil/Desktop/munish-projects/pups4sale/next-frontend/public/Pups4sale.jpg', 'uploads/limo.png');
