import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1775045073398080';
    const redirectUri = 'http://localhost:3001/api/auth/threads/callback';
    
    // Try with Instagram Business login flow
    // This should show "Continue with Instagram" option
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management',
      response_type: 'code',
      state: state,
      // Force Instagram login option
      extras: JSON.stringify({
        setup: {
          channel: 'IG_API_ONBOARDING'
        }
      })
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    
    console.log('Instagram Business OAuth URL:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return NextResponse.json({ error: 'Failed to initialize authentication' }, { status: 500 });
  }
}