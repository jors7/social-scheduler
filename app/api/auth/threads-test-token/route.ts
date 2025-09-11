import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const appId = process.env.THREADS_APP_ID || '1074593118154653';
    const appSecret = process.env.THREADS_APP_SECRET || '775901361bf3c2853b0396d973d7c428';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';
    // Use the redirect_uri that was used in the authorization request
    const redirectUri = redirect_uri || `${baseUrl}/threads-capture`;

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
      'https://graph.facebook.com/v21.0/oauth/access_token',
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

        // If successful, try to get profile with different approaches
        if (response.ok && typeof data === 'object' && data.access_token) {
          const profileTests = [];
          
          // Test 1: Use 'me' endpoint
          try {
            const meUrl = `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${data.access_token}`;
            const meResponse = await fetch(meUrl);
            const meData = await meResponse.json();
            profileTests.push({
              endpoint: 'me',
              status: meResponse.status,
              data: meData
            });
          } catch (e) {
            profileTests.push({ endpoint: 'me', error: String(e) });
          }
          
          // Test 2: Use user_id directly
          if (data.user_id) {
            try {
              const userUrl = `https://graph.threads.net/v1.0/${data.user_id}?fields=id,username&access_token=${data.access_token}`;
              const userResponse = await fetch(userUrl);
              const userData = await userResponse.json();
              profileTests.push({
                endpoint: `user_id: ${data.user_id}`,
                status: userResponse.status,
                data: userData
              });
            } catch (e) {
              profileTests.push({ endpoint: 'user_id', error: String(e) });
            }
          }
          
          // Test 3: Try threads_publishing_limit endpoint
          try {
            const limitUrl = `https://graph.threads.net/v1.0/${data.user_id || 'me'}/threads_publishing_limit?fields=quota_usage,config&access_token=${data.access_token}`;
            const limitResponse = await fetch(limitUrl);
            const limitData = await limitResponse.json();
            profileTests.push({
              endpoint: 'threads_publishing_limit',
              status: limitResponse.status,
              data: limitData
            });
          } catch (e) {
            profileTests.push({ endpoint: 'threads_publishing_limit', error: String(e) });
          }
          
          // Test 4: Try to create a test post (without actually posting)
          try {
            const testUrl = `https://graph.threads.net/v1.0/${data.user_id || 'me'}/threads?access_token=${data.access_token}`;
            const testResponse = await fetch(testUrl, {
              method: 'GET' // Just GET to see if endpoint exists
            });
            const testData = await testResponse.text();
            profileTests.push({
              endpoint: 'threads_endpoint_test',
              status: testResponse.status,
              data: testData
            });
          } catch (e) {
            profileTests.push({ endpoint: 'threads_endpoint_test', error: String(e) });
          }
          
          results[results.length - 1].profile_tests = profileTests;
          results[results.length - 1].token_info = {
            has_token: true,
            user_id: data.user_id,
            token_length: data.access_token.length
          };
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