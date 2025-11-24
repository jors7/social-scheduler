import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNov22Posts() {
  console.log('Checking Nov 22 posts...\n');

  // Query posts from Nov 22, 2025
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .gte('created_at', '2025-11-22T00:00:00Z')
    .lt('created_at', '2025-11-23T00:00:00Z')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('No posts found from Nov 22, 2025');
    console.log('Checking most recent posts instead...\n');

    // Get the most recent posts
    const { data: recentPosts, error: recentError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError || !recentPosts || recentPosts.length === 0) {
      console.log('No recent posts found');
      return;
    }

    console.log(`Found ${recentPosts.length} most recent posts:\n`);
    for (const post of recentPosts) {
      console.log(`- ${post.content?.substring(0, 40)}... (${post.platforms.join(', ')}) - ${post.created_at}`);
    }
    return;
  }

  console.log(`Found ${posts.length} posts from Nov 22:\n`);

  for (const post of posts) {
    console.log('='.repeat(80));
    console.log(`Content: ${post.content?.substring(0, 50)}...`);
    console.log(`Platforms: ${JSON.stringify(post.platforms)}`);
    console.log(`Status: ${post.status}`);
    console.log(`Posted at: ${post.posted_at}`);
    console.log(`Media URLs: ${JSON.stringify(post.media_urls, null, 2)}`);
    console.log(`Created at: ${post.created_at}`);

    // Check if URLs are accessible
    if (post.media_urls && Array.isArray(post.media_urls)) {
      console.log('\nChecking URL accessibility:');
      for (const url of post.media_urls) {
        const urlString = typeof url === 'string' ? url : url?.url || url?.thumbnailUrl;
        if (urlString) {
          try {
            const response = await fetch(urlString, { method: 'HEAD' });
            console.log(`  ${urlString.substring(0, 60)}... - ${response.ok ? '✅ EXISTS' : '❌ NOT FOUND'} (${response.status})`);
          } catch (error) {
            console.log(`  ${urlString.substring(0, 60)}... - ❌ ERROR: ${error}`);
          }
        }
      }
    }

    console.log('\n');
  }
}

checkNov22Posts().catch(console.error);
