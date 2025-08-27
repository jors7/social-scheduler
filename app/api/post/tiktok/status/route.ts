import { NextRequest, NextResponse } from 'next/server';
import { TikTokService } from '@/lib/tiktok/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, publishId } = body;

    if (!accessToken || !publishId) {
      return NextResponse.json(
        { error: 'Access token and publish ID required' },
        { status: 400 }
      );
    }

    const tiktokService = new TikTokService(accessToken);
    const status = await tiktokService.checkUploadStatus(publishId);

    return NextResponse.json({
      success: true,
      status: status,
      message: getStatusMessage(status)
    });

  } catch (error) {
    console.error('TikTok status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'PUBLISH_COMPLETE':
      return 'Video published successfully!';
    case 'DOWNLOAD_IN_PROGRESS':
      return 'TikTok is downloading your video...';
    case 'PROCESSING':
      return 'Video is being processed...';
    case 'FAILED':
      return 'Video upload failed. Please try again.';
    default:
      return `Status: ${status}`;
  }
}