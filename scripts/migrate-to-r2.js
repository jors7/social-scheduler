const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// R2 configuration
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  publicUrl: process.env.R2_PUBLIC_URL,
};

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

// Mapping of local files to R2 URLs (will be generated)
const urlMappings = {};

async function uploadToR2(filePath, keyPrefix = 'static-assets') {
  try {
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath);
    
    // Generate R2 key
    const key = `${keyPrefix}/${fileName}`;
    
    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    
    await r2Client.send(uploadCommand);
    
    // Generate public URL
    const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;
    
    // Store mapping
    const localPath = `/${fileName}`;
    urlMappings[localPath] = publicUrl;
    
    console.log(`✅ Uploaded: ${fileName} → ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message);
    return null;
  }
}

async function migratePublicImages() {
  console.log('🚀 Starting migration to Cloudflare R2...\n');
  
  // Check R2 configuration
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.bucketName || !R2_CONFIG.publicUrl) {
    console.error('❌ R2 configuration is incomplete. Please check your .env.local file.');
    process.exit(1);
  }
  
  console.log('📁 Uploading images from public folder...\n');
  
  // Get all WebP and PNG files from public folder
  const publicFiles = await fs.readdir('./public');
  const imageFiles = publicFiles.filter(file => 
    file.match(/\.(webp|png|jpg|jpeg)$/i)
  );
  
  // Upload each file
  for (const file of imageFiles) {
    const filePath = path.join('./public', file);
    await uploadToR2(filePath);
  }
  
  // Upload app icons if they exist
  console.log('\n📁 Uploading app icons...\n');
  const appFiles = await fs.readdir('./app');
  const iconFiles = appFiles.filter(file => 
    file.match(/\.(webp|png)$/i)
  );
  
  for (const file of iconFiles) {
    const filePath = path.join('./app', file);
    await uploadToR2(filePath);
  }
  
  // Generate URL mappings file
  console.log('\n📝 Generating URL mappings...\n');
  
  const mappingsContent = `// Auto-generated R2 URL mappings
// Generated on: ${new Date().toISOString()}

export const R2_IMAGE_URLS = ${JSON.stringify(urlMappings, null, 2)};

// Helper function to get R2 URL for a local path
export function getR2Url(localPath: string): string {
  return R2_IMAGE_URLS[localPath] || localPath;
}

// Common images
export const IMAGES = {
  logo: R2_IMAGE_URLS['/SocialCal.webp'] || '/SocialCal.webp',
  heroDashboard: R2_IMAGE_URLS['/hero-dashboard.webp'] || '/hero-dashboard.webp',
  janOrsula: R2_IMAGE_URLS['/Jan-Orsula.webp'] || '/Jan-Orsula.webp',
  icon: R2_IMAGE_URLS['/icon.webp'] || '/icon.webp',
  appleIcon: R2_IMAGE_URLS['/apple-icon.webp'] || '/apple-icon.webp',
};
`;
  
  await fs.writeFile('./lib/r2-images.ts', mappingsContent);
  console.log('✅ Created lib/r2-images.ts with URL mappings\n');
  
  // Show summary
  console.log('✨ Migration complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Run: npm run update-r2-refs');
  console.log('2. Test that all images load correctly');
  console.log('3. Once verified, you can remove images from public folder\n');
  
  console.log('📌 URL Mappings:');
  Object.entries(urlMappings).forEach(([local, r2]) => {
    console.log(`   ${local} → ${r2}`);
  });
}

// Run migration
migratePublicImages().catch(console.error);