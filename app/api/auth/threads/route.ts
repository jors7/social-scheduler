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

    // Use Threads OAuth endpoint directly
    const authUrl = `https://threads.net/oauth/authorize?${threadsParams.toString()}`;
    
    console.log('Using Facebook OAuth for Threads:', authUrl);
    console.log('Auth params:', {
      client_id: process.env.THREADS_APP_ID,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish',
      state: state
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}