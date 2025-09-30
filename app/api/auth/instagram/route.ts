import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Instagram OAuth Initialization ===');
    
    // Use Instagram-specific credentials
    const instagramAppId = process.env.INSTAGRAM_CLIENT_ID || '1322876636131547';
    const instagramAppSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    
    console.log('Environment check:', {
      hasInstagramClientId: !!instagramAppId,
      hasInstagramClientSecret: !!instagramAppSecret,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (!instagramAppId || !instagramAppSecret) {
      console.error('Missing Instagram API credentials');
      console.error('INSTAGRAM_CLIENT_ID:', instagramAppId ? 'set' : 'missing');
      console.error('INSTAGRAM_CLIENT_SECRET:', instagramAppSecret ? 'set' : 'missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('instagram_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // Generate logger ID for tracking
    const loggerId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Instagram API with Instagram Login - Option B (Instagram-only, no Facebook)
    // instagramAppId is already defined above

    // Build params for Instagram OAuth
    const authParams = new URLSearchParams();
    authParams.append('client_id', instagramAppId);
    authParams.append('redirect_uri', redirectUri);
    // Working scopes + insights scope
    authParams.append('scope', 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights');
    authParams.append('response_type', 'code');
    authParams.append('state', state);

    // Add timestamp to prevent caching
    authParams.append('t', Date.now().toString());

    console.log('=== Instagram OAuth Authorize ===');
    console.log('Client ID:', instagramAppId);
    console.log('Redirect URI (exact):', redirectUri);
    console.log('Full auth params:', authParams.toString());

    // Use Instagram OAuth endpoint (NOT Facebook!)
    const authUrl = `https://www.instagram.com/oauth/authorize?${authParams.toString()}`;

    console.log('Instagram Business OAuth URL generated');
    console.log('Logger ID:', loggerId);
    console.log('Redirect URI:', redirectUri);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Instagram OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}