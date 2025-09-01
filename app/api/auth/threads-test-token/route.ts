import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || '775901361bf3c2853b0396d973d7c428';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/auth/threads/callback`;

    // Try token exchange with detailed logging
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Token exchange attempt with:', {
      client_id: appId,
      redirect_uri: redirectUri,
      code_preview: code.substring(0, 10) + '...'
    });

    // Try multiple endpoints
    const endpoints = [
      'https://graph.threads.net/oauth/access_token',
      'https://graph.facebook.com/v18.0/oauth/access_token',
      'https://api.threads.net/oauth/access_token'
    ];

    const results: any[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString()
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        results.push({
          endpoint,
          status: response.status,
          success: response.ok,
          data
        });

        // If successful, try to get profile
        if (response.ok && typeof data === 'object' && data.access_token) {
          const profileUrl = `https://graph.threads.net/v1.0/${data.user_id || 'me'}?fields=id,username,threads_profile_picture_url&access_token=${data.access_token}`;
          
          try {
            const profileResponse = await fetch(profileUrl);
            const profileData = await profileResponse.json();
            
            results[results.length - 1].profile = {
              status: profileResponse.status,
              data: profileData
            };
          } catch (e) {
            results[results.length - 1].profile = {
              error: String(e)
            };
          }
        }
      } catch (e) {
        results.push({
          endpoint,
          error: String(e)
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      app_id: appId,
      redirect_uri: redirectUri,
      results
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}