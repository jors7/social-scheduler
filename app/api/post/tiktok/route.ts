import { NextRequest, NextResponse } from 'next/server';
import { TikTokService } from '@/lib/tiktok/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('TikTok POST request body:', body);
    const { accessToken, content, videoUrl, privacyLevel, options } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'TikTok access token required' },
        { status: 400 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'TikTok requires a video URL' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Caption/content required' },
        { status: 400 }
      );
    }

    // Format content for TikTok's requirements
    const formattedContent = TikTokService.formatContent(content);

    // Create TikTok service
    const tiktokService = new TikTokService(accessToken);

    try {
      // Create the post
      const result = await tiktokService.createPost(
        formattedContent,
        videoUrl,
        privacyLevel || 'PUBLIC_TO_EVERYONE',
        options
      );

      return NextResponse.json({
        success: true,
        publishId: result.publishId,
        message: 'TikTok video upload initiated successfully',
      });
    } catch (postError: any) {
      console.error('TikTok posting error:', postError);
      
      // Check for specific error types
      if (postError.message.includes('401')) {
        return NextResponse.json(
          { 
            error: 'TikTok authentication failed. Please reconnect your account.',
            details: postError.message 
          },
          { status: 401 }
        );
      }

      if (postError.message.includes('video')) {
        return NextResponse.json(
          { 
            error: 'Video upload failed. Please ensure the video meets TikTok requirements.',
            details: postError.message 
          },
          { status: 400 }
        );
      }

      throw postError;
    }

  } catch (error) {
    console.error('TikTok posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to TikTok' },
      { status: 500 }
    );
  }
}