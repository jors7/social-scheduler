import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = 'test_' + Math.random().toString(36).substring(7);
    
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const baseUrl = 'https://www.socialcal.app';
    
    // Use the already registered callback URL
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;
    
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
    
    // Return as redirect to test the flow
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Threads OAuth error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}