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

    // Use Facebook OAuth with Instagram permissions
    // This works when Instagram Business Login product is not available
    const authParams = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
      response_type: 'code',
      auth_type: 'rerequest', // Force re-authorization
      display: 'page'
    });

    // Use Facebook OAuth flow for Instagram Business accounts
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${authParams.toString()}`;

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