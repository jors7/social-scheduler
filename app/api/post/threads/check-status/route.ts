import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { postId, accessToken } = await request.json();

    if (!postId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check the status of the published post
    const statusUrl = `https://graph.threads.net/v1.0/${postId}?fields=id,text,permalink,timestamp,media_type,media_url,thumbnail_url,username,is_quote_post&access_token=${accessToken}`;
    
    console.log('Checking Threads post status for ID:', postId);
    
    const response = await fetch(statusUrl);
    const data = await response.json();
    
    console.log('Post status response:', {
      status: response.status,
      data: data
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error?.message || 'Failed to get post status',
          details: data.error
        },
        { status: 400 }
      );
    }

    // Also try to get the permalink directly
    let permalink = data.permalink;
    if (!permalink && data.username) {
      // Construct a likely permalink
      permalink = `https://www.threads.net/@${data.username}/post/${postId}`;
    }

    return NextResponse.json({
      success: true,
      postId: postId,
      status: 'published',
      data: data,
      permalink: permalink,
      message: 'Post published successfully. It may take a few moments to appear on your profile.'
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check post status' },
      { status: 500 }
    );
  }
}