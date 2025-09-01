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

    const appId = '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET || '775901361bf3c2853b0396d973d7c428';
    
    // Try a shorter redirect URI path
    const redirectUri = 'https://www.socialcal.app/api/threads/cb';
    
    // Build the URL with client_secret
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    });

    const authUrl = `https://graph.threads.net/oauth/authorize?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      redirect_uri: redirectUri,
      note: 'Using shorter redirect URI to avoid truncation',
      add_this_to_app: redirectUri
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}