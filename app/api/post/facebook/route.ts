import { NextRequest, NextResponse } from 'next/server';
import { FacebookClient } from '@/lib/facebook/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { pageId, pageAccessToken, message, mediaUrls } = await request.json();
    
    if (!pageId || !pageAccessToken || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, pageAccessToken, message' },
        { status: 400 }
      );
    }

    console.log('Posting to Facebook page:', pageId);
    console.log('Message length:', message.length);
    console.log('Media URLs:', mediaUrls);

    // Use Facebook client to post
    const facebookClient = new FacebookClient();
    const result = await facebookClient.postToPage(pageId, pageAccessToken, message, mediaUrls);
    
    console.log('Facebook post successful:', result.id);
    
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Posted to Facebook successfully'
    });

  } catch (error) {
    console.error('Facebook posting error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to post to Facebook',
        success: false 
      },
      { status: 500 }
    );
  }
}