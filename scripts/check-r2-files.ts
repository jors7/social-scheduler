import { r2Storage } from '@/lib/r2/storage';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkR2Files() {
  console.log('Checking R2 storage...\n');

  try {
    // List all objects in R2
    const objects = await r2Storage.listObjects();

    console.log(`Total files in R2: ${objects.length}\n`);

    if (objects.length === 0) {
      console.log('❌ NO FILES IN R2 STORAGE!');
      console.log('This explains why all URLs return 404.');
      console.log('\nPossible causes:');
      console.log('1. Files were deleted by cleanup logic');
      console.log('2. Files were manually deleted');
      console.log('3. Wrong R2 bucket is configured');
      return;
    }

    // Show first 10 files
    console.log('First 10 files:');
    for (const obj of objects.slice(0, 10)) {
      console.log(`  ${obj.key} (${Math.round(obj.size / 1024)}KB) - ${obj.lastModified}`);
    }

    console.log('\nChecking specific Nov 22 files:');

    // Check if specific files exist
    const testKeys = [
      '0f9598f7-d295-4841-a382-73304a103365/1763833466514_3wmn6.png', // Pinterest
      '0f9598f7-d295-4841-a382-73304a103365/1763826588418_lhku4.png', // Bluesky
      '0f9598f7-d295-4841-a382-73304a103365/1763826317126_7ht17.png', // Bluesky
    ];

    for (const key of testKeys) {
      const exists = await r2Storage.exists(key);
      console.log(`  ${key.split('/')[1]} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

    // Check files by age
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldFiles = objects.filter(f => f.lastModified < cutoffTime);

    console.log(`\n Files older than 24 hours: ${oldFiles.length}`);
    console.log(`Files newer than 24 hours: ${objects.length - oldFiles.length}`);

  } catch (error) {
    console.error('Error checking R2:', error);
  }
}

checkR2Files().catch(console.error);
