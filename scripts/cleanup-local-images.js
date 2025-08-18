const fs = require('fs').promises;
const path = require('path');

async function cleanupLocalImages() {
  console.log('🧹 Cleaning up local images...\n');
  
  const imagesToRemove = [
    // Public folder images
    'public/SocialCal.png',
    'public/SocialCal.webp',
    'public/hero-dashboard.png',
    'public/hero-dashboard.webp',
    'public/Jan-Orsula.png',
    'public/Jan-Orsula.webp',
    // App icons
    'app/icon.png',
    'app/icon.webp',
    'app/apple-icon.png',
    'app/apple-icon.webp',
  ];
  
  let removedCount = 0;
  
  for (const imagePath of imagesToRemove) {
    try {
      const fullPath = path.join(process.cwd(), imagePath);
      await fs.unlink(fullPath);
      console.log(`✅ Removed: ${imagePath}`);
      removedCount++;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⏭️  Already removed: ${imagePath}`);
      } else {
        console.error(`❌ Failed to remove ${imagePath}:`, error.message);
      }
    }
  }
  
  console.log(`\n✨ Cleanup complete! Removed ${removedCount} files.`);
  console.log('\n📌 All images are now served from Cloudflare R2!');
  console.log('   URL: https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/');
}

// Run cleanup
cleanupLocalImages().catch(console.error);