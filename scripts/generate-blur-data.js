const { getPlaiceholder } = require('plaiceholder');
const fs = require('fs').promises;
const path = require('path');

// List of images to generate blur data for
const IMAGES = [
  {
    id: 'hero-dashboard',
    url: 'https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/hero-dashboard.webp',
    description: 'Hero section dashboard image'
  },
  // Add more images here as needed
];

async function generateBlurData() {
  console.log('🎨 Generating blur placeholders...\n');
  
  const blurData = {};
  
  for (const image of IMAGES) {
    try {
      console.log(`Processing: ${image.description}`);
      
      // Fetch image from URL
      const response = await fetch(image.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${image.url}: ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Generate blur placeholder
      const { base64, metadata } = await getPlaiceholder(buffer, {
        size: 10, // Small size for blur
      });
      
      blurData[image.id] = {
        base64,
        width: metadata.width,
        height: metadata.height,
        url: image.url,
        description: image.description
      };
      
      console.log(`✅ Generated blur for: ${image.id}`);
      console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`   Base64 length: ${base64.length} chars\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${image.id}:`, error.message);
    }
  }
  
  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'lib', 'blur-data.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(blurData, null, 2),
    'utf-8'
  );
  
  console.log(`\n✨ Blur data saved to: ${outputPath}`);
  console.log(`📊 Total images processed: ${Object.keys(blurData).length}`);
}

// Run the script
generateBlurData().catch(console.error);