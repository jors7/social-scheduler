import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID;
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.socialcal.app'
    : 'http://localhost:3001';
  
  const redirectUri = `${baseUrl}/api/auth/threads/callback`;
  const state = 'test123';
  
  const params = new URLSearchParams({
    client_id: appId!,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,instagram_content_publish',
    response_type: 'code',
    state: state,
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  
  return NextResponse.json({
    debug: {
      appId: appId,
      appIdLength: appId?.length,
      baseUrl: baseUrl,
      redirectUri: redirectUri,
      nodeEnv: process.env.NODE_ENV,
      fullAuthUrl: authUrl,
      decodedRedirectUri: decodeURIComponent(redirectUri),
      params: Object.fromEntries(params.entries())
    }
  });
}