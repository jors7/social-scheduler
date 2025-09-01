import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = Math.random().toString(36).substring(7);
    
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Try Instagram OAuth URL with Threads app ID
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    });

    // Use Instagram OAuth endpoint
    const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      endpoint: 'instagram.com OAuth with Threads App ID',
      app_id: appId,
      redirect_uri: redirectUri
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}