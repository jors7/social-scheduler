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
    const redirectUri = 'http://localhost:3001/api/auth/threads/callback';
    
    // Try with Instagram-specific configuration
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      // Only request Instagram permissions, no Facebook permissions
      scope: 'instagram_basic',
      response_type: 'code',
      state: state,
      // This parameter tells Facebook to show Instagram login option
      auth_type: 'rerequest',
      // This forces the login dialog to show Instagram option
      display: 'page',
      // This parameter might help show Instagram login
      extras: JSON.stringify({
        setup: {
          channel: 'IG_API_ONBOARDING'
        }
      })
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    
    console.log('Final Threads OAuth URL:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}