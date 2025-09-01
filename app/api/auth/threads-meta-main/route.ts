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

    // Use MAIN Meta App ID, not Threads App ID
    const appId = process.env.META_APP_ID || '2531688437193427';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Try with Instagram scopes that might give Threads access
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list',
    });

    // Use Facebook OAuth with main Meta App ID
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      note: 'Using MAIN Meta App ID with Instagram scopes',
      app_id: appId,
      redirect_uri: redirectUri
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}