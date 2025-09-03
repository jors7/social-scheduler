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

    // Detect if media is a video
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
    const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
    
    console.log('Media detection:', {
      url: mediaUrl.substring(0, 50) + '...',
      isVideo: isVideo
    });

    const result = await service.createPost({
      mediaUrl: mediaUrl,
      caption: text,
      isVideo: isVideo
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