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

    // Use the main Meta App ID for Facebook OAuth
    const appId = process.env.META_APP_ID || '2531688437193427';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Use Facebook OAuth with Threads permissions
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      // Add config_id for Threads
      config_id: process.env.THREADS_APP_ID || '1074593118154653',
    });

    // Use Facebook OAuth endpoint
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      debug: {
        using: 'Facebook OAuth with Threads config',
        main_app_id: appId,
        threads_config_id: process.env.THREADS_APP_ID || '1074593118154653',
        redirect_uri: redirectUri
      }
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}