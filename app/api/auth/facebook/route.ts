import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Facebook OAuth Initialization ===');
    
    // Use dedicated Facebook app credentials
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
    
    console.log('Environment check:', {
      hasFacebookAppId: !!facebookAppId,
      hasFacebookAppSecret: !!facebookAppSecret,
      usingDedicatedApp: !!process.env.FACEBOOK_APP_ID,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (!facebookAppId || !facebookAppSecret) {
      console.error('Missing Facebook API credentials');
      console.error('FACEBOOK_APP_ID:', facebookAppId ? 'set' : 'missing');
      console.error('FACEBOOK_APP_SECRET:', facebookAppSecret ? 'set' : 'missing');
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

    // Build Facebook OAuth URL
    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: redirectUri,
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
      response_type: 'code',
      state: state,
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

    console.log('Facebook OAuth URL:', authUrl);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Facebook OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}