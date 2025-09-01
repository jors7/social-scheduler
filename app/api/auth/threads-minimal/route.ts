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
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'https://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Try with NO scopes - Threads might grant default permissions
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      // No scope parameter - let Threads use defaults
    });

    const authUrl = `https://threads.net/oauth/authorize?${params.toString()}`;
    
    console.log('Minimal Threads OAuth URL (no scopes):', authUrl);
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}