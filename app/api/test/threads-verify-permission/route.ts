import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the user's Threads account from database
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get Threads account with token
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .single();
    
    if (error || !account) {
      return NextResponse.json({ error: 'No Threads account found' }, { status: 404 });
    }
    
    const accessToken = account.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 });
    }
    
    console.log('Testing Threads token permissions...');
    
    // Test 1: Get basic user info
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    
    const meData = await meResponse.json();
    if (!meResponse.ok) {
      return NextResponse.json({ 
        error: 'Token is invalid',
        details: meData 
      }, { status: 400 });
    }
    
    // Test 2: Create a simple text post (should work with basic permissions)
    const basicPostBody = new URLSearchParams();
    basicPostBody.append('media_type', 'TEXT');
    basicPostBody.append('text', `Permission test - ${Date.now()}`);
    basicPostBody.append('access_token', accessToken);
    
    const basicPostResponse = await fetch(
      `https://graph.threads.net/v1.0/${meData.id}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: basicPostBody.toString()
      }
    );
    
    const basicPostData = await basicPostResponse.json();
    const canCreateBasicPost = basicPostResponse.ok && basicPostData.id;
    
    // Test 3: Try to use reply_to_id (requires threads_manage_replies)
    const replyTestBody = new URLSearchParams();
    replyTestBody.append('media_type', 'TEXT');
    replyTestBody.append('text', 'Reply permission test');
    replyTestBody.append('reply_to_id', '12345'); // Fake ID just to test the parameter
    replyTestBody.append('access_token', accessToken);
    
    const replyTestResponse = await fetch(
      `https://graph.threads.net/v1.0/${meData.id}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyTestBody.toString()
      }
    );
    
    const replyTestData = await replyTestResponse.json();
    
    // Analyze the results
    let replyPermissionStatus = 'unknown';
    if (replyTestResponse.ok) {
      replyPermissionStatus = 'granted';
    } else if (replyTestData.error) {
      const errorMessage = replyTestData.error.message || '';
      const errorCode = replyTestData.error.code;
      
      if (errorCode === 10 || errorMessage.includes('permission')) {
        replyPermissionStatus = 'denied - no permission';
      } else if (errorMessage.includes('Invalid reply_to_id')) {
        replyPermissionStatus = 'granted - parameter accepted';
      } else {
        replyPermissionStatus = `error: ${errorMessage}`;
      }
    }
    
    return NextResponse.json({
      user: {
        id: meData.id,
        username: meData.username
      },
      permissions: {
        basic_posting: canCreateBasicPost ? 'granted' : 'denied',
        reply_to_id: replyPermissionStatus,
        raw_error: replyTestData.error || null
      },
      token_info: {
        has_token: true,
        account_id: account.id,
        expires_at: account.expires_at
      }
    });
    
  } catch (error) {
    console.error('Permission test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}