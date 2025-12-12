import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateBlogImages() {
  console.log('Updating blog post featured images...\n');

  const updates = [
    {
      slug: 'save-15-hours-weekly-social-media-scheduling-playbook',
      featured_image: '/images/blog/save-time-social-media.svg',
      title: 'Time Savings'
    },
    {
      slug: 'buffer-vs-hootsuite-vs-later-vs-socialcal-comparison-2025',
      featured_image: '/images/blog/scheduler-comparison.svg',
      title: 'Comparison'
    },
    {
      slug: 'complete-guide-threads-bluesky-2025',
      featured_image: '/images/blog/threads-bluesky-guide.svg',
      title: 'Threads/Bluesky'
    },
    {
      slug: 'how-to-understand-social-media-analytics-beginners-guide',
      featured_image: '/images/blog/social-media-analytics.svg',
      title: 'Analytics'
    }
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('blog_posts')
      .update({ featured_image: update.featured_image })
      .eq('slug', update.slug);

    if (error) {
      console.error(`❌ Error updating "${update.title}":`, error.message);
    } else {
      console.log(`✅ Updated: "${update.title}" → ${update.featured_image}`);
    }
  }

  console.log('\n✨ Blog images updated successfully!');
}

updateBlogImages().catch(console.error);
