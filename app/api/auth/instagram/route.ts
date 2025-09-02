import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Instagram OAuth Initialization ===');
    console.log('Environment check:', {
      hasMetaAppId: !!process.env.META_APP_ID,
      hasMetaAppSecret: !!process.env.META_APP_SECRET,
      metaAppIdLength: process.env.META_APP_ID?.length,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      console.error('Missing Meta API credentials');
      console.error('META_APP_ID:', process.env.META_APP_ID ? 'set' : 'missing');
      console.error('META_APP_SECRET:', process.env.META_APP_SECRET ? 'set' : 'missing');
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

    // Build Instagram Business OAuth parameters
    const params = {
      client_id: process.env.META_APP_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'instagram_business_basic,instagram_business_content_publish',
      logger_id: loggerId,
      app_id: process.env.META_APP_ID,
      platform_app_id: process.env.META_APP_ID
    };

    // Use Instagram direct business OAuth flow (no Facebook Login required!)
    const authUrl = `https://www.instagram.com/consent/?flow=ig_biz_login_oauth&params_json=${encodeURIComponent(JSON.stringify(params))}&source=oauth_permissions_page_www`;

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