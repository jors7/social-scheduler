import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = Math.random().toString(36).substring(7);
    
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1775045073398080';
    const redirectUri = 'http://localhost:3001/api/auth/threads/callback';
    
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish,instagram_basic',
      response_type: 'code',
      state: state,
      // This might show Instagram login option
      extras: JSON.stringify({
        tp: 'ig' // tp = third party, ig = instagram
      })
    });

    // Use Facebook OAuth with Instagram hint
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    
    console.log('Hybrid Threads OAuth URL:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}