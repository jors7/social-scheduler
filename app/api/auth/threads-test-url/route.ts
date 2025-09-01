import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const appId = '1074593118154653';
  const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
  
  // Build URL manually without scope
  const baseUrl = 'https://threads.net/oauth/authorize';
  const authUrl = `${baseUrl}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=test123`;
  
  return NextResponse.json({ 
    authUrl,
    directLink: authUrl,
    components: {
      base: baseUrl,
      client_id: appId,
      redirect_uri: redirectUri,
      redirect_uri_encoded: encodeURIComponent(redirectUri),
    }
  });
}