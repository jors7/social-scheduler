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
    const appId = process.env.THREADS_APP_ID || '1074593118154653'; // Your actual Threads App ID
    const appSecret = process.env.THREADS_APP_SECRET || '775901361bf3c2853b0396d973d7c428'; // Your Threads App Secret
    
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

    // Threads uses a privacy consent flow, not standard OAuth
    // Generate a logger ID (UUID-like)
    const loggerId = `${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    
    // Build the consent URL with nested parameters - matching exact format from working example
    const consentParams = new URLSearchParams({
      flow: 'gdp',
      'params[redirect_uri]': `"${redirectUri}"`, // Note the quotes around the URI
      'params[app_id]': appId!,
      'params[display]': '"page"',
      'params[logger_id]': `"${loggerId}"`,
      'params[response_type]': '"code"',
      'params[scope]': '["threads_basic","threads_content_publish","threads_manage_replies"]', // Including threads_manage_replies for reply_to_id support
      'params[state]': state,
      'params[next]': '"read"',
      'params[steps]': '{"read":["threads_basic","threads_content_publish","threads_manage_replies"]}', // Including threads_manage_replies for reply_to_id support
      'params[south_korea_ux]': 'false',
      source: 'gdp_delegated'
    });

    // Use Threads privacy consent endpoint
    const authUrl = `https://www.threads.com/privacy/consent/?${consentParams.toString()}`;
    
    console.log('Threads OAuth URL (Instagram direct):', authUrl);
    console.log('Parameters:', {
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
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