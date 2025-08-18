const fs = require('fs').promises;
const path = require('path');

// R2 URL mappings
const R2_URLS = {
  '/SocialCal.webp': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp',
  '/hero-dashboard.webp': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp',
  '/Jan-Orsula.webp': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/Jan-Orsula.webp',
  '/icon.webp': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/icon.webp',
  '/apple-icon.webp': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/apple-icon.webp',
  // Also map PNG versions for metadata files
  '/SocialCal.png': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.png',
  '/icon.png': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/icon.png',
  '/apple-icon.png': 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/apple-icon.png',
};

// Files to update
const filesToUpdate = [
  'app/page.tsx',
  'app/pricing/page.tsx',
  'app/about/page.tsx',
  'app/terms/page.tsx',
  'app/privacy/page.tsx',
  'app/layout.tsx',
  'components/dashboard/sidebar.tsx',
  'components/blog/blog-layout.tsx'
];

async function updateFileReferences(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = await fs.readFile(fullPath, 'utf8');
    let updated = false;
    
    // Replace each URL
    for (const [localPath, r2Url] of Object.entries(R2_URLS)) {
      const patterns = [
        // Match src="/image.ext"
        new RegExp(`src="${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
        // Match src='/image.ext'
        new RegExp(`src='${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        // Match icon: '/image.ext' in metadata
        new RegExp(`icon: '${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        // Match apple: '/image.ext' in metadata
        new RegExp(`apple: '${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          const replacement = pattern.source.includes('icon:') 
            ? `icon: '${r2Url}'`
            : pattern.source.includes('apple:')
            ? `apple: '${r2Url}'`
            : `src="${r2Url}"`;
            
          content = content.replace(pattern, replacement);
          updated = true;
        }
      }
    }
    
    if (updated) {
      await fs.writeFile(fullPath, content);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    return false;
  }
}

async function updateAllReferences() {
  console.log('🔄 Updating image references to use R2 URLs...\n');
  
  let updatedCount = 0;
  
  for (const file of filesToUpdate) {
    const updated = await updateFileReferences(file);
    if (updated) updatedCount++;
  }
  
  console.log(`\n✨ Update complete! Modified ${updatedCount} files.`);
  console.log('\n📋 Next steps:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Check that all images load from R2');
  console.log('3. Once verified, run: npm run cleanup-local-images');
}

// Run the update
updateAllReferences().catch(console.error);