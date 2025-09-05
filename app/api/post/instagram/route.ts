import { NextRequest, NextResponse } from 'next/server';
import { InstagramService } from '@/lib/instagram/service';

export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, text, mediaUrl, mediaUrls, isStory } = await request.json();

    if (!userId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Stories don't require captions, but feed posts do
    if (!isStory && !text) {
      return NextResponse.json(
        { error: 'Caption is required for feed posts' },
        { status: 400 }
      );
    }

    // Instagram requires at least one media item
    const allMediaUrls = mediaUrls || (mediaUrl ? [mediaUrl] : []);
    
    if (allMediaUrls.length === 0) {
      return NextResponse.json(
        { error: 'Instagram posts require at least one image or video' },
        { status: 400 }
      );
    }

    console.log('Creating Instagram post:', {
      userId,
      hasToken: !!accessToken,
      textLength: text?.length || 0,
      mediaCount: allMediaUrls.length,
      isCarousel: allMediaUrls.length > 1,
      isStory: !!isStory
    });

    // Get Instagram app secret from environment
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
    
    console.log('Instagram API endpoint:', {
      hasAppSecret: !!appSecret,
      secretStart: appSecret ? appSecret.substring(0, 4) + '...' : 'none'
    });

    const service = new InstagramService({
      accessToken,
      userID: userId,
      appSecret: appSecret
    });

    const result = await service.createPost({
      mediaUrls: allMediaUrls,
      caption: text || '',
      isStory: isStory
    });

    console.log(`Instagram ${isStory ? 'story' : 'post'} created:`, result);

    return NextResponse.json({
      success: true,
      id: result.id,
      type: isStory ? 'story' : 'post',
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