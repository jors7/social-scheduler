import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Service key exists:', !!supabaseServiceKey);
console.log('Service key length:', supabaseServiceKey?.length || 0);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabaseMedia() {
  console.log('Checking database for media URLs...\n');

  // Check scheduled_posts
  const { data: scheduledPosts, error: scheduledError } = await supabase
    .from('scheduled_posts')
    .select('id, platforms, media_urls, created_at')
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (scheduledError) {
    console.error('Error fetching scheduled posts:', JSON.stringify(scheduledError, null, 2));
  } else {
    console.log(`✅ Found ${scheduledPosts?.length || 0} scheduled posts with media_urls NOT NULL\n`);

    if (scheduledPosts && scheduledPosts.length > 0) {
      console.log('Sample posts:');
      for (const post of scheduledPosts.slice(0, 3)) {
        console.log(`\n  ID: ${post.id}`);
        console.log(`  Platforms: ${JSON.stringify(post.platforms)}`);
        console.log(`  Created: ${post.created_at}`);
        console.log(`  Media URLs type: ${typeof post.media_urls}`);
        console.log(`  Media URLs: ${JSON.stringify(post.media_urls, null, 2)}`);
      }
    }
  }

  // Check drafts
  const { data: drafts, error: draftsError } = await supabase
    .from('drafts')
    .select('id, media_urls, created_at')
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (draftsError) {
    console.error('\nError fetching drafts:', JSON.stringify(draftsError, null, 2));
  } else {
    console.log(`\n\n✅ Found ${drafts?.length || 0} drafts with media_urls NOT NULL`);

    if (drafts && drafts.length > 0) {
      console.log('\nSample drafts:');
      for (const draft of drafts.slice(0, 2)) {
        console.log(`\n  ID: ${draft.id}`);
        console.log(`  Created: ${draft.created_at}`);
        console.log(`  Media URLs: ${JSON.stringify(draft.media_urls, null, 2)}`);
      }
    }
  }

  // Count total posts
  const { count: totalPosts } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true });

  const { count: postsWithMedia } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true })
    .not('media_urls', 'is', null);

  console.log(`\n\n📊 Statistics:`);
  console.log(`  Total scheduled_posts: ${totalPosts}`);
  console.log(`  Posts with media_urls: ${postsWithMedia}`);
  console.log(`  Posts without media_urls: ${(totalPosts || 0) - (postsWithMedia || 0)}`);
}

checkDatabaseMedia().catch(console.error);
