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

    // Try Threads direct OAuth with correct App ID format
    const threadsParams = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
    });

    // Try Instagram Basic Display endpoint for Threads
    const instagramUrl = `https://api.instagram.com/oauth/authorize?${threadsParams.toString()}`;
    
    // Use Threads OAuth endpoint directly
    const authUrl = `https://threads.net/oauth/authorize?${threadsParams.toString()}`;
    
    console.log('Instagram OAuth URL:', instagramUrl);
    
    console.log('Generated Threads OAuth URL:', authUrl);
    console.log('Full URL breakdown:', {
      baseUrl: 'https://threads.net/oauth/authorize',
      client_id: process.env.THREADS_APP_ID,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
      fullUrl: authUrl
    });
    
    // Also try alternative parameter format
    const altParams = new URLSearchParams({
      app_id: process.env.THREADS_APP_ID!,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state: state,
    });
    const altUrl = `https://threads.net/oauth/authorize?${altParams.toString()}`;
    console.log('Alternative URL with app_id:', altUrl);

    // Try Instagram OAuth endpoint instead
    return NextResponse.json({ authUrl: instagramUrl });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}