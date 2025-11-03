import { NextRequest, NextResponse } from 'next/server';
import { BlueskyService } from '@/lib/bluesky/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Bluesky Post Request ===');

    const { identifier, password, text, mediaUrls, altText, replyControl } = await request.json();

    if (!identifier || !password || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: identifier, password, text' },
        { status: 400 }
      );
    }

    console.log('Posting to Bluesky as:', identifier);
    console.log('Text length:', text.length);
    console.log('Media URLs:', mediaUrls);
    console.log('Reply control:', replyControl || 'everyone (default)');

    // Use Bluesky service to post
    const blueskyService = new BlueskyService();
    const result = await blueskyService.createPost(identifier, password, text, mediaUrls, altText, replyControl);

    console.log('Bluesky post successful:', result.uri);

    return NextResponse.json({
      success: true,
      uri: result.uri,
      cid: result.cid,
      message: 'Posted to Bluesky successfully'
    });

  } catch (error) {
    console.error('Bluesky posting error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to post to Bluesky',
        success: false
      },
      { status: 500 }
    );
  }
}