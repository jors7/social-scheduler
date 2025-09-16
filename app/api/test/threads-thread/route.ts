import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    
    console.log('=== Testing Threads Thread Creation ===');
    
    // Step 1: Get the Threads user ID
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    );
    
    if (!meResponse.ok) {
      const error = await meResponse.json();
      return NextResponse.json({ 
        error: 'Failed to get user info', 
        details: error 
      }, { status: 400 });
    }
    
    const userData = await meResponse.json();
    const threadsUserId = userData.id;
    console.log('Threads user:', { id: threadsUserId, username: userData.username });
    
    // Step 2: Create starter post
    console.log('Creating starter post...');
    const starterFormData = new URLSearchParams();
    starterFormData.append('media_type', 'TEXT');
    starterFormData.append('text', 'Test Thread - Post 1: This is the starter post');
    starterFormData.append('reply_control', 'everyone');
    starterFormData.append('access_token', accessToken);
    
    const starterResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: starterFormData.toString()
      }
    );
    
    if (!starterResponse.ok) {
      const error = await starterResponse.json();
      return NextResponse.json({ 
        error: 'Failed to create starter container', 
        details: error 
      }, { status: 400 });
    }
    
    const starterContainer = await starterResponse.json();
    console.log('Starter container created:', starterContainer.id);
    
    // Step 3: Publish starter post
    const publishStarterData = new URLSearchParams();
    publishStarterData.append('creation_id', starterContainer.id);
    publishStarterData.append('access_token', accessToken);
    
    const publishStarterResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishStarterData.toString()
      }
    );
    
    if (!publishStarterResponse.ok) {
      const error = await publishStarterResponse.json();
      return NextResponse.json({ 
        error: 'Failed to publish starter', 
        details: error 
      }, { status: 400 });
    }
    
    const starterPost = await publishStarterResponse.json();
    console.log('Starter published:', starterPost.id);
    
    // Wait a bit before creating reply
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Create reply with reply_to_id
    console.log('Creating reply to starter...');
    const replyFormData = new URLSearchParams();
    replyFormData.append('media_type', 'TEXT');
    replyFormData.append('text', 'Test Thread - Post 2: This is a reply to the starter');
    replyFormData.append('reply_to_id', starterPost.id);
    replyFormData.append('access_token', accessToken);
    
    const replyResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: replyFormData.toString()
      }
    );
    
    if (!replyResponse.ok) {
      const error = await replyResponse.json();
      return NextResponse.json({ 
        error: 'Failed to create reply container', 
        details: error,
        starterPostId: starterPost.id
      }, { status: 400 });
    }
    
    const replyContainer = await replyResponse.json();
    console.log('Reply container created:', replyContainer.id);
    
    // Step 5: Publish reply
    const publishReplyData = new URLSearchParams();
    publishReplyData.append('creation_id', replyContainer.id);
    publishReplyData.append('access_token', accessToken);
    
    const publishReplyResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishReplyData.toString()
      }
    );
    
    if (!publishReplyResponse.ok) {
      const error = await publishReplyResponse.json();
      return NextResponse.json({ 
        error: 'Failed to publish reply', 
        details: error 
      }, { status: 400 });
    }
    
    const replyPost = await publishReplyResponse.json();
    console.log('Reply published:', replyPost.id);
    
    return NextResponse.json({
      success: true,
      message: 'Thread created successfully!',
      thread: {
        starterPostId: starterPost.id,
        replyPostId: replyPost.id,
        username: userData.username
      }
    });
    
  } catch (error) {
    console.error('Thread test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}