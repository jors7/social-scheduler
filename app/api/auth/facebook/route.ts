import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Facebook OAuth Initialization ===');
    
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      console.error('Missing Facebook API credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in cookies
    const cookieStore = cookies();
    cookieStore.set('facebook_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    // Facebook OAuth 2.0 parameters
    const authParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: [
        'public_profile',
        'pages_show_list',
        'pages_read_engagement', 
        'pages_manage_posts',
        'business_management'
      ].join(','),
      response_type: 'code',
      display: 'popup'
    });

    // Use Facebook OAuth endpoint
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${authParams.toString()}`;

    console.log('Facebook OAuth URL generated');
    console.log('Client ID:', process.env.FACEBOOK_APP_ID);
    console.log('Redirect URI:', redirectUri);
    console.log('Scopes requested:', authParams.get('scope'));

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Facebook OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}