import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    
    console.log('=== Testing Simplified Thread Creation ===');
    
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
    
    // Step 2: Create starter post using URL parameters (not body)
    console.log('Creating starter post...');
    
    const starterParams = new URLSearchParams({
      'message': 'Test Thread Post 1 - Starter',
      'access_token': accessToken
    });
    
    // Try with URL parameters in the query string
    const starterUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
    
    const starterResponse = await fetch(starterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: starterParams.toString()
    });
    
    const starterData = await starterResponse.json();
    console.log('Starter response:', starterData);
    
    if (!starterResponse.ok) {
      // Try alternative parameter name
      console.log('First attempt failed, trying with "text" parameter...');
      
      const altParams = new URLSearchParams({
        'text': 'Test Thread Post 1 - Starter',
        'media_type': 'TEXT',
        'access_token': accessToken
      });
      
      const altResponse = await fetch(starterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: altParams.toString()
      });
      
      const altData = await altResponse.json();
      console.log('Alternative response:', altData);
      
      if (!altResponse.ok) {
        return NextResponse.json({ 
          error: 'Failed to create starter container', 
          attempt1: starterData,
          attempt2: altData
        }, { status: 400 });
      }
      
      // Use the alternative response
      starterData.id = altData.id;
    }
    
    const starterContainerId = starterData.id;
    console.log('Starter container created:', starterContainerId);
    
    // Step 3: Publish starter post
    const publishStarterParams = new URLSearchParams({
      'creation_id': starterContainerId,
      'access_token': accessToken
    });
    
    const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
    
    const publishStarterResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishStarterParams.toString()
    });
    
    const publishStarterData = await publishStarterResponse.json();
    console.log('Publish starter response:', publishStarterData);
    
    if (!publishStarterResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to publish starter', 
        details: publishStarterData 
      }, { status: 400 });
    }
    
    const starterPostId = publishStarterData.id;
    console.log('Starter published with ID:', starterPostId);
    
    // Wait before creating reply
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Create reply with reply_to_id
    console.log('Creating reply to starter...');
    
    // Try the documented approach from your notes
    const replyParams = new URLSearchParams({
      'message': 'Test Thread Post 2 - This is a reply',
      'reply_to_id': starterPostId,
      'access_token': accessToken
    });
    
    const replyResponse = await fetch(starterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: replyParams.toString()
    });
    
    const replyData = await replyResponse.json();
    console.log('Reply response:', replyData);
    
    if (!replyResponse.ok) {
      // Try with text parameter instead
      console.log('Reply with "message" failed, trying with "text"...');
      
      const altReplyParams = new URLSearchParams({
        'text': 'Test Thread Post 2 - This is a reply',
        'media_type': 'TEXT',
        'reply_to_id': starterPostId,
        'access_token': accessToken
      });
      
      const altReplyResponse = await fetch(starterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: altReplyParams.toString()
      });
      
      const altReplyData = await altReplyResponse.json();
      console.log('Alternative reply response:', altReplyData);
      
      if (!altReplyResponse.ok) {
        return NextResponse.json({ 
          error: 'Failed to create reply container',
          starterPostId: starterPostId,
          attempt1: replyData,
          attempt2: altReplyData
        }, { status: 400 });
      }
      
      replyData.id = altReplyData.id;
    }
    
    const replyContainerId = replyData.id;
    console.log('Reply container created:', replyContainerId);
    
    // Step 5: Publish reply
    const publishReplyParams = new URLSearchParams({
      'creation_id': replyContainerId,
      'access_token': accessToken
    });
    
    const publishReplyResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishReplyParams.toString()
    });
    
    const publishReplyData = await publishReplyResponse.json();
    console.log('Publish reply response:', publishReplyData);
    
    if (!publishReplyResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to publish reply', 
        details: publishReplyData 
      }, { status: 400 });
    }
    
    const replyPostId = publishReplyData.id;
    console.log('Reply published with ID:', replyPostId);
    
    return NextResponse.json({
      success: true,
      message: 'Thread created successfully!',
      thread: {
        starterPostId,
        replyPostId,
        username: userData.username
      },
      details: {
        starterContainer: starterContainerId,
        replyContainer: replyContainerId
      }
    });
    
  } catch (error) {
    console.error('Thread test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
}