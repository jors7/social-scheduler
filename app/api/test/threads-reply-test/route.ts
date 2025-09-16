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
    
    // Test 1: Create and publish a starter post
    console.log('=== Test 1: Creating starter post ===');
    const starterFormData = new URLSearchParams();
    starterFormData.append('media_type', 'TEXT');
    starterFormData.append('text', `Test starter ${Date.now()}`);
    starterFormData.append('access_token', accessToken);
    
    const starterResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: starterFormData.toString()
      }
    );
    
    const starterContainer = await starterResponse.json();
    console.log('Starter container response:', starterContainer);
    
    if (!starterResponse.ok || !starterContainer.id) {
      return NextResponse.json({ 
        error: 'Failed to create starter',
        details: starterContainer 
      }, { status: 400 });
    }
    
    // Publish the starter
    const publishFormData = new URLSearchParams();
    publishFormData.append('creation_id', starterContainer.id);
    publishFormData.append('access_token', accessToken);
    
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishFormData.toString()
      }
    );
    
    const publishedPost = await publishResponse.json();
    console.log('Published starter:', publishedPost);
    
    if (!publishResponse.ok || !publishedPost.id) {
      return NextResponse.json({ 
        error: 'Failed to publish starter',
        details: publishedPost 
      }, { status: 400 });
    }
    
    const starterPostId = publishedPost.id;
    
    // Wait for the post to be fully available
    console.log('Waiting 3 seconds for post to be available...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Create a reply WITH reply_to_id
    console.log('=== Test 2: Creating reply with reply_to_id ===');
    const replyFormData = new URLSearchParams();
    replyFormData.append('media_type', 'TEXT');
    replyFormData.append('text', `Test reply ${Date.now()}`);
    replyFormData.append('reply_to_id', starterPostId);
    replyFormData.append('access_token', accessToken);
    
    console.log('Reply form data:', {
      text: `Test reply ${Date.now()}`,
      reply_to_id: starterPostId,
      endpoint: `https://graph.threads.net/v1.0/${threadsUserId}/threads`
    });
    
    const replyResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyFormData.toString()
      }
    );
    
    const replyContainer = await replyResponse.json();
    console.log('Reply container response:', replyContainer);
    
    if (!replyResponse.ok || !replyContainer.id) {
      return NextResponse.json({ 
        error: 'Failed to create reply container',
        starterPostId,
        details: replyContainer 
      }, { status: 400 });
    }
    
    // Try to publish the reply
    console.log('=== Test 3: Publishing reply ===');
    const replyPublishFormData = new URLSearchParams();
    replyPublishFormData.append('creation_id', replyContainer.id);
    replyPublishFormData.append('access_token', accessToken);
    
    const replyPublishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyPublishFormData.toString()
      }
    );
    
    const publishedReply = await replyPublishResponse.json();
    console.log('Published reply response:', publishedReply);
    
    return NextResponse.json({
      success: replyPublishResponse.ok,
      starterPost: {
        containerId: starterContainer.id,
        postId: starterPostId
      },
      replyContainer: {
        containerId: replyContainer.id,
        response: replyContainer
      },
      replyPublish: {
        success: replyPublishResponse.ok,
        response: publishedReply
      },
      summary: replyPublishResponse.ok 
        ? 'Successfully created thread with reply' 
        : 'Reply container created but publish failed'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}