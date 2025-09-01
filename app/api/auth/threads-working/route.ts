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

    // Use MAIN Meta App ID - this is what actually works
    const appId = process.env.META_APP_ID || '2531688437193427';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads-working/callback';
    
    // Request Instagram and Pages permissions
    // This will give us access to Instagram Business Accounts which can post to Threads
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management',
    });

    // Use Facebook OAuth with main Meta App ID
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}