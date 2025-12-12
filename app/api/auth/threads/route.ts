import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth Initialization ===');
    console.log('Environment check:', {
      hasAppId: !!process.env.THREADS_APP_ID,
      nodeEnv: process.env.NODE_ENV,
    });

    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID;

    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate cryptographically secure state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in cookies with secure settings
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true, // Always use secure (required for SameSite=None)
      sameSite: 'none', // Required for cross-site OAuth redirects
      maxAge: 60 * 10, // 10 minutes
      path: '/',
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