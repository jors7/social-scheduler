const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function verifyBlurData() {
  console.log('🔍 Verifying blur data in database...\n');
  
  try {
    // Fetch all blog posts with featured images
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, featured_image, featured_image_blur')
      .not('featured_image', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Total posts with images: ${posts.length}`);
    
    const withBlur = posts.filter(p => p.featured_image_blur);
    const withoutBlur = posts.filter(p => !p.featured_image_blur);
    
    console.log(`✅ Posts with blur data: ${withBlur.length}`);
    console.log(`❌ Posts without blur data: ${withoutBlur.length}`);
    
    if (withBlur.length > 0) {
      console.log('\n📊 Sample blur data (first 50 chars):');
      console.log(`   ${withBlur[0].featured_image_blur.substring(0, 50)}...`);
    }
    
    if (withoutBlur.length > 0) {
      console.log('\n⚠️  Posts still missing blur:');
      withoutBlur.forEach(p => console.log(`   - ${p.title}`));
    }
    
    console.log('\n✨ Verification complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyBlurData();