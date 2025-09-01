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

    // Use your Threads app ID
    const appId = '1775045073398080';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;
    
    // Build Threads.com OAuth URL directly!
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
    });

    // Use threads.com OAuth endpoint directly!
    const authUrl = `https://www.threads.com/oauth/authorize?${params.toString()}`;
    
    console.log('Direct Threads OAuth URL:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}