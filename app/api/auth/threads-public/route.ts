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
    
    // Try with public_ prefix as these might be the public API scopes
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'public_profile', // Try with Facebook-style scope
    });

    const authUrl = `https://threads.net/oauth/authorize?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      debug: {
        scopes_tried: 'public_profile',
        app_id: appId,
        redirect_uri: redirectUri
      }
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}