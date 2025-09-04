import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/facebook/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, accessToken, text, mediaUrls } = body;

    if (!pageId || !accessToken || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, accessToken, and text are required' },
        { status: 400 }
      );
    }

    console.log('=== Facebook Post Request ===');
    console.log('Page ID:', pageId);
    console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
    console.log('Media count:', mediaUrls?.length || 0);

    const facebookService = new FacebookService();
    let result;

    // Determine post type based on media
    if (!mediaUrls || mediaUrls.length === 0) {
      // Text-only post
      console.log('Creating text-only Facebook post');
      result = await facebookService.createPost(pageId, accessToken, text);
    } else if (mediaUrls.length === 1) {
      // Single media post (photo or video)
      const mediaUrl = mediaUrls[0];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

      if (isVideo) {
        console.log('Creating Facebook video post');
        result = await facebookService.createVideoPost(pageId, accessToken, text, mediaUrl);
      } else {
        console.log('Creating Facebook photo post');
        result = await facebookService.createPhotoPost(pageId, accessToken, text, mediaUrl);
      }
    } else {
      // Multiple photos (carousel post)
      // Filter out videos for carousel (Facebook doesn't support mixed media carousels)
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const imageUrls = mediaUrls.filter((url: string) => 
        !videoExtensions.some(ext => url.toLowerCase().includes(ext))
      );

      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'Facebook does not support multiple videos in a single post' },
          { status: 400 }
        );
      }

      console.log(`Creating Facebook carousel post with ${imageUrls.length} images`);
      result = await facebookService.createCarouselPost(pageId, accessToken, text, imageUrls);
    }

    console.log('Facebook post successful:', result);

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Posted to Facebook successfully'
    });

  } catch (error) {
    console.error('Facebook posting error:', error);
    
    if (error instanceof Error) {
      // Check for common Facebook API errors
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        return NextResponse.json(
          { error: 'Facebook access token has expired. Please reconnect your Facebook account.' },
          { status: 401 }
        );
      }
      
      if (errorMessage.includes('permission')) {
        return NextResponse.json(
          { error: 'Missing permissions to post to this Facebook page. Please reconnect with proper permissions.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to post to Facebook' },
      { status: 500 }
    );
  }
}