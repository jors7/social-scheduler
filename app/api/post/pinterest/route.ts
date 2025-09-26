import { NextRequest, NextResponse } from 'next/server';
import { PinterestService, formatPinterestContent } from '@/lib/pinterest/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Pinterest POST request body:', body);
    const { accessToken, boardId, title, description, imageUrl, link } = body;

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

    // Format content for Pinterest
    const formattedContent = formatPinterestContent(description || '', title);

    // Create Pinterest service
    const pinterestService = new PinterestService(accessToken);

    try {
      // Create the pin
      const result = await pinterestService.createPin(
        boardId,
        formattedContent.title,
        formattedContent.description,
        imageUrl,
        link
      );

      return NextResponse.json({
        success: true,
        id: result.id,
        url: `https://www.pinterest.com/pin/${result.id}/`,
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
      
      if (pinError.message.includes('400') || pinError.message.includes('Bad Request')) {
        return NextResponse.json(
          { 
            error: 'Invalid pin data. Please check your board selection and ensure you have an image attached.',
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