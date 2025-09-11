import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Threads Debug Callback ===');
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Log all parameters
    const allParams = Object.fromEntries(searchParams.entries());
    console.log('All callback parameters:', JSON.stringify(allParams, null, 2));
    
    if (error) {
      return NextResponse.json({ 
        error: 'OAuth error', 
        details: error,
        all_params: allParams 
      });
    }

    if (!code) {
      return NextResponse.json({ 
        error: 'No code received',
        all_params: allParams 
      });
    }

    // Try token exchange
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;
    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;
    
    const tokenParams = new URLSearchParams({
      client_id: appId!,
      client_secret: appSecret!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Token exchange params:', {
      client_id: appId,
      redirect_uri: redirectUri,
      code: code.substring(0, 10) + '...'
    });

    const tokenUrl = `https://graph.threads.net/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString()
    });
    
    const tokenText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response body:', tokenText);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      return NextResponse.json({ 
        error: 'Failed to parse token response',
        status: tokenResponse.status,
        response: tokenText 
      });
    }

    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        error: 'Token exchange failed',
        status: tokenResponse.status,
        response: tokenData 
      });
    }

    // Try to get user profile
    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;
    
    // Try different endpoints
    const endpoints = [
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
      `https://graph.threads.net/v1.0/${userId}?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
      `https://graph.facebook.com/v21.0/me?access_token=${accessToken}`,
    ];
    
    const results: Record<string, any> = {};
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      results[endpoint.split('?')[0]] = {
        status: response.status,
        data: data
      };
    }

    return NextResponse.json({
      success: true,
      token_data: {
        has_access_token: !!tokenData.access_token,
        has_user_id: !!tokenData.user_id,
        user_id: tokenData.user_id,
        expires_in: tokenData.expires_in
      },
      profile_results: results
    });

  } catch (error) {
    console.error('Debug callback error:', error);
    return NextResponse.json({ 
      error: 'Callback failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}