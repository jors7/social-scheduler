import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = Math.random().toString(36).substring(7);
    
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    // Use debug callback
    const redirectUri = `${baseUrl}/api/auth/threads-debug-callback`;
    
    // Generate a logger ID
    const loggerId = `${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    
    // Build the consent URL with nested parameters
    const consentParams = new URLSearchParams({
      flow: 'gdp',
      'params[redirect_uri]': `"${redirectUri}"`,
      'params[app_id]': appId!,
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
    
    return NextResponse.json({ 
      authUrl,
      debug_info: {
        app_id: appId,
        redirect_uri: redirectUri,
        note: 'This uses the debug callback to log detailed information'
      }
    });
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}