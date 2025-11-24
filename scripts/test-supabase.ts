import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Testing Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Service key length:', supabaseServiceKey?.length);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  // Test 1: Simple count
  console.log('\n1. Testing simple count...');
  const { count, error: countError } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('   ❌ Count error:', countError);
  } else {
    console.log('   ✅ Total posts:', count);
  }

  // Test 2: Select with limit
  console.log('\n2. Testing select with limit...');
  const { data, error: selectError } = await supabase
    .from('scheduled_posts')
    .select('id, created_at')
    .limit(1);

  if (selectError) {
    console.error('   ❌ Select error:', selectError);
  } else {
    console.log('   ✅ Found posts:', data?.length);
  }

  // Test 3: Select with media_urls
  console.log('\n3. Testing select with media_urls...');
  const { data: mediaData, error: mediaError } = await supabase
    .from('scheduled_posts')
    .select('id, media_urls')
    .limit(1);

  if (mediaError) {
    console.error('   ❌ Media error:', JSON.stringify(mediaError, null, 2));
  } else {
    console.log('   ✅ Found posts:', mediaData?.length);
    if (mediaData && mediaData.length > 0) {
      console.log('   Sample:', JSON.stringify(mediaData[0], null, 2));
    }
  }
}

test().catch(console.error);
