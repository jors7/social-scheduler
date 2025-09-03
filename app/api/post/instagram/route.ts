import { NextRequest, NextResponse } from 'next/server';
import { InstagramService } from '@/lib/instagram/service';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, text, mediaUrl } = await request.json();

    if (!userId || !accessToken || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Instagram requires an image
    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Instagram posts require an image' },
        { status: 400 }
      );
    }

    console.log('Creating Instagram post:', {
      userId,
      hasToken: !!accessToken,
      textLength: text.length,
      hasMedia: !!mediaUrl
    });

    const service = new InstagramService({
      accessToken,
      userID: userId,
    });

    const result = await service.createPost({
      imageUrl: mediaUrl,
      caption: text,
    });

    console.log('Instagram post created:', result);

    return NextResponse.json({
      success: true,
      id: result.id,
      ...result
    });

  } catch (error: any) {
    console.error('Instagram posting error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to post to Instagram',
        details: error
      },
      { status: 500 }
    );
  }
}