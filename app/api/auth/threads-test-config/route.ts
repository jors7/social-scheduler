import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.socialcal.app'
    : 'https://localhost:3001';
    
  const redirectUri = `${baseUrl}/api/auth/threads/callback`;
  const appId = process.env.THREADS_APP_ID || '1074593118154653';
  
  // Test if the redirect URI is properly registered
  const testUrl = `https://threads.net/oauth/authorize?` + new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,instagram_content_publish',
    response_type: 'code',
    state: 'test123'
  }).toString();
  
  return NextResponse.json({
    configuration: {
      threads_app_id: appId,
      threads_app_secret: process.env.THREADS_APP_SECRET ? 'SET' : 'MISSING',
      redirect_uri: redirectUri,
      environment: process.env.NODE_ENV,
      base_url: baseUrl
    },
    test_auth_url: testUrl,
    instructions: [
      '1. Make sure this redirect_uri is added to your Threads app settings',
      '2. Go to Meta Developer Dashboard > Your App > Use Cases > Access the Threads API',
      '3. In the OAuth Redirect URIs field, add exactly: ' + redirectUri,
      '4. Save the changes and wait a minute for them to propagate',
      '5. Try the authentication flow again'
    ]
  });
}