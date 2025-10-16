import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/facebook/service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, accessToken, text, mediaUrls, isStory, isReel, userId } = body;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId and accessToken are required' },
        { status: 400 }
      );
    }

    // Stories and Reels require media, feed posts require text
    if (isStory && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Facebook Stories require an image or video' },
        { status: 400 }
      );
    }

    if (isReel && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Facebook Reels require a video' },
        { status: 400 }
      );
    }

    // Note: Facebook feed posts don't require text - they can be media-only posts
    // Text is optional for feed posts with media

    console.log('=== Facebook Post Request ===');
    console.log('Page ID:', pageId);
    console.log('Is Story:', isStory);
    console.log('Is Reel:', isReel);
    console.log('Has media:', !!mediaUrls && mediaUrls.length > 0);
    console.log('Media count:', mediaUrls?.length || 0);

    // Create Supabase client for thumbnail upload
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const facebookService = new FacebookService();
    let result;

    // Handle Reel posts
    if (isReel) {
      const videoUrl = mediaUrls[0];
      console.log('Creating Facebook Reel');
      result = await facebookService.createReelPost(
        pageId,
        accessToken,
        text,
        videoUrl,
        supabase,
        userId
      );
    }
    // Handle Story posts
    else if (isStory) {
      const mediaUrl = mediaUrls[0];
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
      const isVideo = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));

      console.log(`Creating Facebook ${isVideo ? 'video' : 'photo'} story`);
      result = await facebookService.createStoryPost(
        pageId,
        accessToken,
        mediaUrl,
        isVideo ? 'video' : 'photo',
        supabase,
        userId
      );
    }
    // Handle regular feed posts
    else if (!mediaUrls || mediaUrls.length === 0) {
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

    // Determine success message based on post type
    let successMessage = 'Posted to Facebook successfully';
    if (isReel) {
      successMessage = 'Posted to Facebook Reel successfully';
    } else if (isStory) {
      successMessage = 'Posted to Facebook Story successfully';
    }

    // Prepare response with thumbnail URL if available
    const response: any = {
      success: true,
      id: result.id,
      message: successMessage,
      isStory: isStory || false,  // Include story indicator for detection
      isReel: isReel || false     // Include reel indicator for detection
    };

    // Include thumbnail URL if present (for Reels and video Stories)
    const resultWithThumbnail = result as any;
    if (resultWithThumbnail.thumbnailUrl) {
      response.thumbnailUrl = resultWithThumbnail.thumbnailUrl;
      console.log('✅ Including thumbnail URL in response:', response.thumbnailUrl);
    } else {
      console.log('⚠️ No thumbnail URL found in result');
    }

    console.log('📤 Final API response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

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

      if (errorMessage.includes('copyright')) {
        return NextResponse.json(
          { error: 'Reel blocked by copyright check. Please use original content without copyrighted music or audio.' },
          { status: 400 }
        );
      }

      if (errorMessage.includes('timeout') && errorMessage.includes('15 minutes')) {
        return NextResponse.json(
          { error: 'Reel is still processing after 15 minutes. It may appear on your Facebook page shortly. Check your Reels tab or try again.' },
          { status: 202 } // 202 Accepted - processing not complete
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