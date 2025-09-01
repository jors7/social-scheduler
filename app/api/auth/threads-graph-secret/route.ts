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

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;
    const redirectUri = 'https://www.socialcal.app/api/auth/threads/callback';
    
    // Graph Threads wants client_secret in the authorize URL (unusual but let's try)
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret!, // Adding client_secret to authorize URL
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    });

    // Use graph.threads.net OAuth endpoint
    const authUrl = `https://graph.threads.net/oauth/authorize?${params.toString()}`;
    
    return NextResponse.json({ 
      authUrl,
      endpoint: 'graph.threads.net with client_secret',
      app_id: appId,
      has_secret: !!appSecret,
      redirect_uri: redirectUri
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}