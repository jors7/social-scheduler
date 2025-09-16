import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Initialization ===');
    console.log('Environment check:', {
      hasAppId: !!process.env.META_APP_ID,
      hasAppSecret: !!process.env.META_APP_SECRET,
      nodeEnv: process.env.NODE_ENV,
      appIdValue: process.env.META_APP_ID,
      appIdLength: process.env.META_APP_ID?.length
    });
    
    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '760612513547331'; // Test app for development
    const appSecret = process.env.THREADS_APP_SECRET || '750a8d07e0625cf53eb52dde952dabc7'; // Test app secret
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // For OAuth initiation, we don't actually need the app secret yet
    // It's only needed for token exchange in the callback

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true, // Always use secure in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 60 * 10, // 10 minutes
      path: '/', // Ensure cookie is available across all paths
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Use the standard Threads OAuth flow as recommended
    // Build OAuth parameters
    const oauthParams = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights',
      response_type: 'code',
      state: state
    });

    // Use the correct Threads OAuth endpoint
    const authUrl = `https://threads.net/oauth/authorize?${oauthParams.toString()}`;
    
    console.log('Threads OAuth URL:', authUrl);
    console.log('Parameters:', {
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights',
      response_type: 'code',
      state: state,
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