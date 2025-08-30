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

async function applyMigration() {
  console.log('📦 Applying database migration...\n');
  
  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .rpc('get_column_info', { 
        table_name: 'blog_posts',
        column_name: 'featured_image_blur'
      })
      .single();
    
    // If the RPC doesn't exist or returns an error, try to add the column
    if (checkError || !columns) {
      // Add the column
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE public.blog_posts 
          ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;
          
          COMMENT ON COLUMN public.blog_posts.featured_image_blur IS 'Base64-encoded blur placeholder for the featured image';
        `
      });
      
      if (error) {
        // Try a simpler approach - just check if we can query the column
        const { error: testError } = await supabase
          .from('blog_posts')
          .select('featured_image_blur')
          .limit(1);
        
        if (testError && testError.message.includes('column')) {
          console.log('❌ Cannot add column automatically. Please run this SQL in Supabase SQL Editor:');
          console.log('\n```sql');
          console.log('ALTER TABLE public.blog_posts');
          console.log('ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;');
          console.log('```\n');
          return false;
        }
      }
      console.log('✅ Database column added successfully!\n');
    } else {
      console.log('✅ Database column already exists!\n');
    }
    
    return true;
  } catch (error) {
    // Column might not exist, provide instructions
    console.log('📝 Please run this migration in your Supabase SQL Editor:\n');
    console.log('```sql');
    console.log('ALTER TABLE public.blog_posts');
    console.log('ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;');
    console.log('```\n');
    console.log('Then run this script again.\n');
    return false;
  }
}

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
    // First, try to fetch posts to see if the column exists
    const { data: testFetch, error: testError } = await supabase
      .from('blog_posts')
      .select('id, title, featured_image, featured_image_blur')
      .limit(1);
    
    if (testError && testError.message.includes('column')) {
      console.log('❌ The featured_image_blur column does not exist yet.');
      console.log('Please run this SQL in your Supabase SQL Editor:\n');
      console.log('ALTER TABLE public.blog_posts');
      console.log('ADD COLUMN IF NOT EXISTS featured_image_blur TEXT;\n');
      return;
    }
    
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
async function main() {
  console.log('🚀 Starting blur placeholder generation for existing posts\n');
  console.log('═══════════════════════════════════════\n');
  
  // Process posts (will check for column existence)
  await processExistingPosts();
  
  console.log('\n🎉 Done!');
  process.exit(0);
}

main();