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
    
    // Use the EXACT redirect URI from your screenshot
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Build the URL with client_secret since graph.threads.net requires it
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    });

    // Use graph.threads.net which seems to be the right endpoint
    const authUrl = `https://graph.threads.net/oauth/authorize?${params.toString()}`;
    
    console.log('Threads OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    
    // Return redirect instead of JSON for direct testing
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}