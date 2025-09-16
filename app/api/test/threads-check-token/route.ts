import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the current connected Threads account
    const response = await fetch(`${request.nextUrl.origin}/api/social-accounts`);
    const data = await response.json();
    
    const threadsAccount = data.accounts?.find((a: any) => a.platform === 'threads');
    
    if (!threadsAccount || !threadsAccount.access_token) {
      return NextResponse.json({ error: 'No Threads account connected' }, { status: 400 });
    }
    
    const accessToken = threadsAccount.access_token;
    
    // Check token permissions using Facebook's debug_token endpoint
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();
    
    // Also get the user info to confirm token works
    const userResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    const userData = await userResponse.json();
    
    return NextResponse.json({
      tokenInfo: {
        valid: debugResponse.ok && debugData.data?.is_valid,
        scopes: debugData.data?.scopes || [],
        app_id: debugData.data?.app_id,
        user_id: debugData.data?.user_id,
        expires_at: debugData.data?.expires_at,
        error: debugData.error
      },
      threadsUser: {
        id: userData.id,
        username: userData.username,
        error: userData.error
      },
      rawDebugResponse: debugData
    });
    
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check token'
    }, { status: 500 });
  }
}