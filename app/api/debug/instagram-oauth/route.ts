import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Only allow in development or with secret key
  const secretKey = request.nextUrl.searchParams.get('key');
  if (process.env.NODE_ENV === 'production' && secretKey !== 'debug-instagram-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.socialcal.app'
    : 'http://localhost:3001';
  
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const state = Math.random().toString(36).substring(7);
  const loggerId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  const params = {
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
    scope: 'instagram_business_basic-instagram_business_content_publish', // Use hyphen, not comma!
    logger_id: loggerId,
    app_id: process.env.META_APP_ID,
    platform_app_id: process.env.META_APP_ID
  };

  const authUrl = `https://www.instagram.com/consent/?flow=ig_biz_login_oauth&params_json=${encodeURIComponent(JSON.stringify(params))}&source=oauth_permissions_page_www`;

  // Test token exchange endpoint
  let tokenEndpointStatus = 'unknown';
  try {
    const testUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
    const response = await fetch(testUrl, { method: 'HEAD' });
    tokenEndpointStatus = response.ok ? 'reachable' : `status ${response.status}`;
  } catch (error) {
    tokenEndpointStatus = 'unreachable';
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasMetaAppId: !!process.env.META_APP_ID,
      hasMetaAppSecret: !!process.env.META_APP_SECRET,
      metaAppId: process.env.META_APP_ID,
      appUrl: baseUrl
    },
    oauth: {
      redirectUri,
      authUrl: authUrl.substring(0, 200) + '...',
      fullAuthUrl: authUrl,
      state,
      loggerId
    },
    params: params,
    endpoints: {
      tokenExchange: 'https://graph.facebook.com/v21.0/oauth/access_token',
      tokenEndpointStatus
    },
    requiredDashboardSettings: {
      productName: 'Instagram Business Login',
      validOAuthRedirectURIs: [
        'https://www.socialcal.app/api/auth/instagram/callback',
        'http://localhost:3001/api/auth/instagram/callback'
      ],
      requiredScopes: [
        'instagram_business_basic',
        'instagram_business_content_publish'
      ],
      appMode: 'Live (not Development)'
    },
    troubleshooting: {
      step1: 'Verify META_APP_ID matches your Meta dashboard app ID',
      step2: 'Ensure Instagram Business Login product is added and Live',
      step3: 'Add both redirect URIs to Valid OAuth Redirect URIs',
      step4: 'Ensure your Instagram account is a Business/Creator account',
      step5: 'Link Instagram account to a Facebook Page'
    }
  });
}