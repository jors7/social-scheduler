import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Initialization ===');
    console.log('Environment check:', {
      hasAppId: !!process.env.THREADS_APP_ID,
      hasAppSecret: !!process.env.THREADS_APP_SECRET,
      nodeEnv: process.env.NODE_ENV,
      appIdValue: process.env.THREADS_APP_ID,
      appIdLength: process.env.THREADS_APP_ID?.length
    });
    
    if (!process.env.THREADS_APP_ID || !process.env.THREADS_APP_SECRET) {
      console.error('Missing Threads API credentials');
      console.error('THREADS_APP_ID:', process.env.THREADS_APP_ID ? 'set' : 'missing');
      console.error('THREADS_APP_SECRET:', process.env.THREADS_APP_SECRET ? 'set' : 'missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://social-scheduler-opal.vercel.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Build authorization URL - Threads endpoint with correct parameter names
    const params = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
    });

    // Also try with app_id parameter (Meta sometimes uses this)
    const authUrlWithAppId = `https://threads.net/oauth/authorize?` + 
      new URLSearchParams({
        app_id: process.env.THREADS_APP_ID!,
        redirect_uri: redirectUri,
        scope: 'threads_basic,threads_content_publish',
        response_type: 'code',
        state: state,
      }).toString();

    const authUrl = `https://threads.net/oauth/authorize?${params.toString()}`;
    
    console.log('Trying both URL formats:');
    console.log('client_id version:', authUrl);
    console.log('app_id version:', authUrlWithAppId);

    console.log('Redirecting to Threads auth:', authUrl);
    console.log('Full URL:', authUrl);
    console.log('Auth params:', {
      client_id: process.env.THREADS_APP_ID,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      state: state
    });

    // Return the app_id version since that's what the error is asking for
    return NextResponse.json({ authUrl: authUrlWithAppId });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}