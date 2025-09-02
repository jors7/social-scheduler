import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads OAuth with FULL Permissions ===');
    
    // MUST use THREADS_APP_ID, not the main Meta App ID!
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;
    
    if (!appId) {
      console.error('Missing Threads App ID');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('threads_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Generate a logger ID (UUID-like)
    const loggerId = `${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    
    // Build the consent URL with ALL permissions
    const consentParams = new URLSearchParams({
      flow: 'gdp',
      'params[redirect_uri]': `"${redirectUri}"`,
      'params[app_id]': appId!,
      'params[display]': '"page"',
      'params[logger_id]': `"${loggerId}"`,
      'params[response_type]': '"code"',
      'params[scope]': '["threads_basic","threads_content_publish","threads_manage_replies","threads_read_replies","threads_manage_insights"]',
      'params[state]': state,
      'params[next]': '"read"',
      'params[steps]': '{"read":["threads_basic","threads_content_publish","threads_manage_replies","threads_read_replies","threads_manage_insights"]}',
      'params[south_korea_ux]': 'false',
      source: 'gdp_delegated'
    });

    // Use Threads privacy consent endpoint
    const authUrl = `https://www.threads.com/privacy/consent/?${consentParams.toString()}`;
    
    console.log('Threads OAuth URL with FULL permissions:', authUrl);
    console.log('Requested permissions:', [
      'threads_basic',
      'threads_content_publish', 
      'threads_manage_replies',
      'threads_read_replies',
      'threads_manage_insights'
    ]);

    return NextResponse.json({ 
      authUrl,
      permissions: 'ALL (basic, publish, replies, insights)',
      note: 'This requests all permissions for testing. Use only after permissions are approved.'
    });
  } catch (error) {
    console.error('Threads OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}