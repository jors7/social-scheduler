const { createClient } = require('@supabase/supabase-js');
const { getPlaiceholder } = require('plaiceholder');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function generateBlurForImage(imageUrl) {
  try {
    console.log(`  Fetching image: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Generate blur placeholder
    const { base64, metadata } = await getPlaiceholder(buffer, {
      size: 10, // Small size for blur
    });
    
    console.log(`  ✅ Generated blur (${metadata.width}x${metadata.height})`);
    return base64;
  } catch (error) {
    console.error(`  ❌ Error generating blur: ${error.message}`);
    return null;
  }
}

async function processExistingPosts() {
  console.log('🎨 Generating blur placeholders for existing blog posts...\n');
  
  try {
    // Fetch all blog posts with featured images but no blur data
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, featured_image, featured_image_blur')
      .not('featured_image', 'is', null)
      .is('featured_image_blur', null);
    
    if (error) {
      throw error;
    }
    
    if (!posts || posts.length === 0) {
      console.log('✨ All posts already have blur placeholders or no posts with images found!');
      return;
    }
    
    console.log(`Found ${posts.length} posts without blur placeholders\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each post
    for (const post of posts) {
      console.log(`Processing: "${post.title}"`);
      
      const blur = await generateBlurForImage(post.featured_image);
      
      if (blur) {
        // Update the post with blur data
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ featured_image_blur: blur })
          .eq('id', post.id);
        
        if (updateError) {
          console.error(`  ❌ Failed to update database: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`  ✅ Saved blur to database`);
          successCount++;
        }
      } else {
        failCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log(`✨ Processing complete!`);
    console.log(`   ✅ Success: ${successCount} posts`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount} posts`);
    }
    console.log(`   📊 Total: ${posts.length} posts`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
processExistingPosts().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
});