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

    // Use Instagram's OAuth URL from Meta dashboard
    const instagramClientId = process.env.INSTAGRAM_CLIENT_ID || '1322876636131547';
    
    const authParams = new URLSearchParams({
      force_reauth: 'true',
      client_id: instagramClientId,
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code'
    });

    // Use the exact URL format from Meta dashboard
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