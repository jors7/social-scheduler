import { NextRequest, NextResponse } from 'next/server';
import { PinterestService, formatPinterestContent } from '@/lib/pinterest/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Pinterest POST request body:', body);
    const { accessToken, boardId, title, description, imageUrl, mediaUrls, pinType, link, altText } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Pinterest access token required' },
        { status: 400 }
      );
    }

    if (!boardId) {
      return NextResponse.json(
        { error: 'Pinterest board ID required' },
        { status: 400 }
      );
    }

    if (!description && !title) {
      return NextResponse.json(
        { error: 'Pin description or title required' },
        { status: 400 }
      );
    }

    // Determine which media to use (support both old imageUrl and new mediaUrls)
    const media = mediaUrls || (imageUrl ? [imageUrl] : []);

    if (!media || media.length === 0) {
      return NextResponse.json(
        { error: 'At least one image or video is required' },
        { status: 400 }
      );
    }

    // Format content for Pinterest
    const formattedContent = formatPinterestContent(description || '', title);

    // Create Pinterest service
    const pinterestService = new PinterestService(accessToken);

    try {
      let result;

      // Create appropriate pin type based on pinType parameter or auto-detect
      const detectedPinType = pinType || 'image';

      console.log('Creating Pinterest pin:', {
        type: detectedPinType,
        mediaCount: media.length,
        title: formattedContent.title.substring(0, 50),
      });

      if (detectedPinType === 'video') {
        // Create video pin
        const videoUrl = media[0];
        const coverImageUrl = media.length > 1 ? media[1] : undefined;

        result = await pinterestService.createVideoPin(
          boardId,
          formattedContent.title,
          formattedContent.description,
          videoUrl,
          coverImageUrl,
          link
        );
      } else if (detectedPinType === 'carousel' && media.length >= 2 && media.length <= 5) {
        // Create carousel pin
        result = await pinterestService.createCarouselPin(
          boardId,
          formattedContent.title,
          formattedContent.description,
          media,
          link
        );
      } else {
        // Create standard image pin
        result = await pinterestService.createPin(
          boardId,
          formattedContent.title,
          formattedContent.description,
          media[0],
          link,
          altText
        );
      }

      return NextResponse.json({
        success: true,
        id: result.id,
        url: `https://www.pinterest.com/pin/${result.id}/`,
        pinType: detectedPinType,
      });
    } catch (pinError: any) {
      console.error('Pinterest pin creation error:', pinError);

      // Handle different error scenarios
      if (pinError.message.includes('401') || pinError.message.includes('Authentication')) {
        return NextResponse.json(
          {
            error: 'Pinterest authentication failed. Please reconnect your Pinterest account.',
            requiresReauth: true,
            details: pinError.message
          },
          { status: 401 }
        );
      }

      if (pinError.message.includes('403') || pinError.message.includes('Forbidden')) {
        return NextResponse.json(
          {
            error: 'Pinterest posting permission denied. Please check your board permissions.',
            details: pinError.message
          },
          { status: 403 }
        );
      }

      // Handle aspect ratio error for carousel pins (this is the most specific error)
      if (pinError.message.includes('same aspect ratio')) {
        return NextResponse.json(
          {
            error: pinError.message, // Use the detailed error message from client
            details: 'All carousel images must have matching dimensions or aspect ratios.'
          },
          { status: 400 }
        );
      }

      if (pinError.message.includes('Carousel pins require 2-5 images')) {
        return NextResponse.json(
          {
            error: 'Carousel pins require between 2 and 5 images.',
            details: pinError.message
          },
          { status: 400 }
        );
      }

      if (pinError.message.includes('400') || pinError.message.includes('Bad Request')) {
        return NextResponse.json(
          {
            error: 'Invalid pin data. Please check your board selection and ensure you have media attached.',
            details: pinError.message
          },
          { status: 400 }
        );
      }

      // Generic error with helpful message
      return NextResponse.json(
        {
          error: 'Unable to post to Pinterest. Please try again or check your board permissions.',
          details: pinError.message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Pinterest posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Pinterest' },
      { status: 500 }
    );
  }
}