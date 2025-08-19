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
      // If we get a 401, it might be because the token doesn't work with sandbox
      // For now, return a more informative error
      if (pinError.message.includes('401')) {
        return NextResponse.json(
          { 
            error: 'Pinterest authentication failed. Note: Trial apps are limited and may not support posting. Please upgrade your Pinterest app to production for full functionality.',
            details: pinError.message 
          },
          { status: 401 }
        );
      }
      throw pinError;
    }

  } catch (error) {
    console.error('Pinterest posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to Pinterest' },
      { status: 500 }
    );
  }
}