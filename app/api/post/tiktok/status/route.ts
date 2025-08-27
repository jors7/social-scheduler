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
    const statusData = await tiktokService.checkUploadStatus(publishId);
    
    // Handle both old (string) and new (object) return formats
    const status = typeof statusData === 'string' ? statusData : statusData.status;
    const fullData = typeof statusData === 'object' 
      ? statusData 
      : { status, publiclyAvailablePostId: undefined, errorCode: undefined, errorMessage: undefined, fullResponse: undefined };

    return NextResponse.json({
      success: true,
      status: status,
      message: getStatusMessage(status),
      publiclyAvailablePostId: fullData.publiclyAvailablePostId || null,
      errorCode: fullData.errorCode || null,
      errorMessage: fullData.errorMessage || null,
      details: fullData.fullResponse || null
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