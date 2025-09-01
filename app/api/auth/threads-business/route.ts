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
    
    // Use config_id to force Instagram Business account login
    // This is used by Instagram Business API
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,business_management',
      response_type: 'code',
      state: state,
      // This parameter might trigger Instagram login option
      config_id: 'instagram_business_config'
    });

    // Try Instagram's own OAuth endpoint (even though it's deprecated, might still work)
    const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    
    console.log('Instagram Business OAuth URL:', authUrl);
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram Business OAuth error:', error);
    return NextResponse.json({ error: 'Failed to initialize authentication' }, { status: 500 });
  }
}