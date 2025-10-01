/**
 * Check Instagram token validity
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkToken() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, username, platform_user_id, access_token, created_at')
    .eq('platform', 'instagram')
    .eq('is_active', true);

  console.log('Instagram accounts:', accounts?.length || 0);

  for (const account of accounts || []) {
    console.log('\n---');
    console.log('Account ID:', account.id);
    console.log('Username:', account.username);
    console.log('Platform User ID:', account.platform_user_id);
    console.log('Token start:', account.access_token?.substring(0, 20));
    console.log('Token end:', account.access_token?.substring(account.access_token.length - 10));
    console.log('Token length:', account.access_token?.length);
    console.log('Created:', account.created_at);

    // Test the token with Instagram API
    console.log('\nTesting token with Instagram Graph API...');
    const testUrl = `https://graph.instagram.com/${account.platform_user_id}/media?fields=id&limit=1&access_token=${account.access_token}`;

    try {
      const response = await fetch(testUrl);
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Token is VALID');
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Token is INVALID');
        console.log('Error:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
  }
}

checkToken().catch(console.error);
