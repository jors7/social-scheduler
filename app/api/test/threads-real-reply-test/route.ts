import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the current token from database
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
    
    // Get the actual token from database
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .single();
    
    if (!account?.access_token) {
      return NextResponse.json({ error: 'No Threads account found' }, { status: 404 });
    }
    
    const accessToken = account.access_token;
    console.log('Using token from database, expires:', account.expires_at);
    
    // Get user info
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    
    const userData = await meResponse.json();
    if (!meResponse.ok) {
      return NextResponse.json({ 
        error: 'Token is invalid',
        details: userData 
      }, { status: 400 });
    }
    
    const threadsUserId = userData.id;
    console.log('Testing with user:', threadsUserId, userData.username);
    
    // Step 1: Create and publish a real starter post
    console.log('Creating real starter post...');
    const starterBody = new URLSearchParams();
    starterBody.append('media_type', 'TEXT');
    starterBody.append('text', `Test starter ${Date.now()}`);
    starterBody.append('access_token', accessToken);
    
    const starterResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: starterBody.toString()
      }
    );
    
    if (!starterResponse.ok) {
      const error = await starterResponse.json();
      return NextResponse.json({ 
        error: 'Failed to create starter',
        details: error 
      }, { status: 400 });
    }
    
    const starterContainer = await starterResponse.json();
    
    // Publish it
    const publishBody = new URLSearchParams();
    publishBody.append('creation_id', starterContainer.id);
    publishBody.append('access_token', accessToken);
    
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString()
      }
    );
    
    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return NextResponse.json({ 
        error: 'Failed to publish starter',
        details: error 
      }, { status: 400 });
    }
    
    const publishedPost = await publishResponse.json();
    const realPostId = publishedPost.id;
    console.log('Real post published:', realPostId);
    
    // Wait different amounts of time and test
    const delays = [1000, 3000, 5000, 10000];
    const results: any[] = [];
    
    for (const delay of delays) {
      console.log(`Waiting ${delay}ms before trying reply...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Try to create a reply
      const replyBody = new URLSearchParams();
      replyBody.append('media_type', 'TEXT');
      replyBody.append('text', `Reply after ${delay}ms`);
      replyBody.append('reply_to_id', realPostId);
      replyBody.append('access_token', accessToken);
      
      const replyResponse = await fetch(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: replyBody.toString()
        }
      );
      
      const replyData = await replyResponse.json();
      
      results.push({
        delay,
        success: replyResponse.ok,
        status: replyResponse.status,
        response: replyData,
        errorCode: replyData.error?.code,
        errorMessage: replyData.error?.message
      });
      
      // If it worked, stop trying
      if (replyResponse.ok) {
        console.log(`Success after ${delay}ms!`);
        break;
      }
    }
    
    // Also test with a fake ID for comparison
    const fakeTestBody = new URLSearchParams();
    fakeTestBody.append('media_type', 'TEXT');
    fakeTestBody.append('text', 'Reply to fake ID');
    fakeTestBody.append('reply_to_id', '12345678901234567');
    fakeTestBody.append('access_token', accessToken);
    
    const fakeTestResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fakeTestBody.toString()
      }
    );
    
    const fakeTestData = await fakeTestResponse.json();
    
    return NextResponse.json({
      realPostId,
      results,
      fakeIdTest: {
        errorCode: fakeTestData.error?.code,
        errorMessage: fakeTestData.error?.message
      },
      analysis: {
        hasConsistentError: results.every(r => r.errorCode === results[0].errorCode),
        allPermissionErrors: results.every(r => r.errorCode === 10),
        anySuccess: results.some(r => r.success)
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}