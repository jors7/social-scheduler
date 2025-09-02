#!/usr/bin/env node

// Test Instagram OAuth configuration
require('dotenv').config({ path: '.env.local' });

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

console.log('=== Instagram OAuth Configuration Test ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log(`   META_APP_ID: ${META_APP_ID ? '✓ Set (' + META_APP_ID + ')' : '✗ Missing'}`);
console.log(`   META_APP_SECRET: ${META_APP_SECRET ? '✓ Set (hidden)' : '✗ Missing'}`);

// Generate test OAuth URLs
const redirectUris = {
  local: 'http://localhost:3001/api/auth/instagram/callback',
  production: 'https://www.socialcal.app/api/auth/instagram/callback'
};

console.log('\n2. Redirect URIs to configure in Meta Dashboard:');
Object.entries(redirectUris).forEach(([env, uri]) => {
  console.log(`   ${env}: ${uri}`);
});

// Generate Instagram Business OAuth URL
const state = Math.random().toString(36).substring(7);
const loggerId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

const params = {
  client_id: META_APP_ID,
  redirect_uri: redirectUris.production,
  response_type: 'code',
  state: state,
  scope: 'instagram_business_basic,instagram_business_content_publish',
  logger_id: loggerId,
  app_id: META_APP_ID,
  platform_app_id: META_APP_ID
};

const authUrl = `https://www.instagram.com/consent/?flow=ig_biz_login_oauth&params_json=${encodeURIComponent(JSON.stringify(params))}&source=oauth_permissions_page_www`;

console.log('\n3. Instagram Business OAuth URL (for testing):');
console.log('   Copy this URL to test OAuth flow:');
console.log(`   ${authUrl.substring(0, 100)}...`);

console.log('\n4. Required Meta Dashboard Settings:');
console.log('   Instagram Business Login Product:');
console.log('   - Status: Live');
console.log('   - Valid OAuth Redirect URIs:');
console.log('     • https://www.socialcal.app/api/auth/instagram/callback');
console.log('     • http://localhost:3001/api/auth/instagram/callback');
console.log('   - Deauthorize Callback URL: (optional)');
console.log('   - Data Deletion Request URL: (optional)');

console.log('\n5. Required Permissions:');
console.log('   - instagram_business_basic');
console.log('   - instagram_business_content_publish');

console.log('\n6. App Configuration:');
console.log(`   Main App ID: ${META_APP_ID}`);
console.log('   Instagram Product ID: (shown in Instagram Business Login settings)');
console.log('   Note: Use the main app ID for OAuth, not the product ID');

console.log('\n=== Test Complete ===');