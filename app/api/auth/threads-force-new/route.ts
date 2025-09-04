import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads Force New Authorization ===');
    
    const appId = process.env.THREADS_APP_ID || '2288572204931387';
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate unique state with timestamp to prevent any caching
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const state = `${timestamp}_${randomStr}`;
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    // Callback URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // First, we'll redirect to a logout URL, then to the auth URL
    // This forces Threads to clear any cached sessions
    const logoutUrl = 'https://www.threads.net/logout';
    
    // Use the privacy consent flow with force re-auth
    const authParams = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
      // Add a random parameter to prevent URL caching
      _ts: timestamp.toString(),
      // Force new authorization
      prompt: 'consent',
      auth_type: 'rerequest'
    });
    
    // Use Threads OAuth endpoint
    const authUrl = `https://www.threads.net/oauth/authorize?${authParams.toString()}`;
    
    console.log('Threads Force New Auth URL generated');
    console.log('Redirect URI:', redirectUri);
    console.log('State:', state);
    console.log('Timestamp:', timestamp);

    // Return both URLs - logout first, then auth
    return NextResponse.json({ 
      authUrl,
      logoutUrl,
      instructions: 'Force new authorization by clearing session first',
      note: 'This will ensure you connect the correct account'
    });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}