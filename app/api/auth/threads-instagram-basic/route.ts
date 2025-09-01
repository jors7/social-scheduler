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

    // Try using Instagram Basic Display API approach
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    const params = new URLSearchParams({
      app_id: appId, // Note: Instagram Basic Display uses app_id, not client_id
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'user_profile,user_media', // Instagram Basic Display scopes
    });

    // Use Instagram OAuth endpoint
    const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      endpoint: 'api.instagram.com',
      app_id: appId,
      redirect_uri: redirectUri
    });
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}