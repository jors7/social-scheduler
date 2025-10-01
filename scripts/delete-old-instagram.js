/**
 * Delete Old Instagram Accounts using Service Role
 * This bypasses RLS to remove problematic accounts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const oldAccountIds = [
  '7d7ad1ea-03b9-4764-ac14-7a606543ab2d',
  '6eba1d27-05eb-4df3-8664-e8642cb2b6e3'
];

async function deleteOldAccounts() {
  console.log('🔧 Creating Supabase client with service role...');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n📋 Before deletion - checking accounts:');
  const { data: beforeAccounts, error: beforeError } = await supabase
    .from('social_accounts')
    .select('id, username, platform, is_active, created_at')
    .eq('platform', 'instagram');

  if (beforeError) {
    console.error('❌ Error fetching accounts:', beforeError);
    return;
  }

  console.log('Found Instagram accounts:', beforeAccounts?.length || 0);
  beforeAccounts?.forEach(acc => {
    console.log(`  - ${acc.id} (${acc.username || 'no username'}) - active: ${acc.is_active} - created: ${acc.created_at}`);
  });

  console.log('\n🗑️  Deleting old accounts...');

  for (const accountId of oldAccountIds) {
    console.log(`\nDeleting account: ${accountId}`);

    const { data, error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error(`❌ Error deleting ${accountId}:`, error);
    } else {
      console.log(`✅ Successfully deleted ${accountId}`);
    }
  }

  console.log('\n📋 After deletion - checking remaining accounts:');
  const { data: afterAccounts, error: afterError } = await supabase
    .from('social_accounts')
    .select('id, username, platform, is_active, created_at')
    .eq('platform', 'instagram');

  if (afterError) {
    console.error('❌ Error fetching accounts:', afterError);
    return;
  }

  console.log('Remaining Instagram accounts:', afterAccounts?.length || 0);
  afterAccounts?.forEach(acc => {
    console.log(`  - ${acc.id} (${acc.username || 'no username'}) - active: ${acc.is_active} - created: ${acc.created_at}`);
  });

  console.log('\n✨ Done! Now reconnect Instagram on production to create a fresh account.');
}

deleteOldAccounts().catch(console.error);
