const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function convertToWebP(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
    console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert ${inputPath}:`, error.message);
    return false;
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next directories
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
        continue;
      }
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const outputPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        
        // Check if WebP version already exists
        try {
          await fs.access(outputPath);
          console.log(`⏭️  Skipping: ${path.basename(outputPath)} already exists`);
        } catch {
          // File doesn't exist, convert it
          await convertToWebP(fullPath, outputPath);
        }
      }
    }
  }
}

async function main() {
  console.log('🖼️  Converting images to WebP format...\n');
  
  // Convert images in public directory
  if (await fs.access('./public').then(() => true).catch(() => false)) {
    console.log('📁 Processing public directory...');
    await processDirectory('./public');
  }
  
  // Convert app icons
  if (await fs.access('./app').then(() => true).catch(() => false)) {
    console.log('\n📁 Processing app directory icons...');
    const appFiles = await fs.readdir('./app');
    for (const file of appFiles) {
      if (file.match(/\.(png|jpg|jpeg)$/i)) {
        const inputPath = path.join('./app', file);
        const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        
        try {
          await fs.access(outputPath);
          console.log(`⏭️  Skipping: ${path.basename(outputPath)} already exists`);
        } catch {
          await convertToWebP(inputPath, outputPath);
        }
      }
    }
  }
  
  console.log('\n✨ Conversion complete!');
  console.log('💡 Remember to update your image imports and Next.js Image components to use .webp files');
}

main().catch(console.error);