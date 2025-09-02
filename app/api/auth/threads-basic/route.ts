import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads Basic OAuth (Minimal Permissions) ===');
    
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Simple state for CSRF
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies with simpler settings
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' to avoid cross-site issues
      maxAge: 60 * 10,
      path: '/',
    });

    // Callback URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Generate logger ID
    const loggerId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Minimal scope - just basic and publish
    const consentParams = new URLSearchParams({
      flow: 'gdp',
      'params[redirect_uri]': `"${redirectUri}"`,
      'params[app_id]': appId,
      'params[display]': '"page"',
      'params[logger_id]': `"${loggerId}"`,
      'params[response_type]': '"code"',
      'params[scope]': '["threads_basic","threads_content_publish"]',
      'params[state]': state,
      'params[next]': '"read"',
      'params[steps]': '{"read":["threads_basic","threads_content_publish"]}',
      'params[south_korea_ux]': 'false',
      source: 'gdp_delegated'
    });

    const authUrl = `https://www.threads.com/privacy/consent/?${consentParams.toString()}`;
    
    console.log('Threads Basic Auth URL generated');
    console.log('Redirect URI:', redirectUri);
    console.log('State:', state);

    return NextResponse.json({ 
      authUrl,
      note: 'Basic permissions only (threads_basic, threads_content_publish)'
    });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}