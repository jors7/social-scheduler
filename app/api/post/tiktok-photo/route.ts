import { NextRequest, NextResponse } from 'next/server';
import { TikTokService } from '@/lib/tiktok/service';

export const maxDuration = 60; // 60 seconds for photo posting
export const dynamic = 'force-dynamic';

/**
 * POST /api/post/tiktok-photo
 *
 * Handles TikTok photo posting (1-35 photos per post)
 *
 * Request body:
 * - accessToken: TikTok user access token
 * - title: Photo post title (max 150 characters)
 * - description: Photo post description (max 4000 characters)
 * - photoUrls: Array of publicly accessible photo URLs (1-35)
 * - photoCoverIndex: Index of photo to use as cover (0-based)
 * - privacyLevel: Privacy level
 * - options: Additional options (disableComment, autoAddMusic, brand toggles)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('TikTok photo POST request received');

    const {
      accessToken,
      title,
      description,
      photoUrls,
      photoCoverIndex,
      privacyLevel,
      options
    } = body;

    // Validation
    if (!accessToken) {
      return NextResponse.json(
        { error: 'TikTok access token required' },
        { status: 400 }
      );
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo URL is required' },
        { status: 400 }
      );
    }

    if (photoUrls.length > 35) {
      return NextResponse.json(
        { error: 'TikTok supports maximum 35 photos per post' },
        { status: 400 }
      );
    }

    if (!title && !description) {
      return NextResponse.json(
        { error: 'Title or description required' },
        { status: 400 }
      );
    }

    // Format title and description for TikTok's requirements
    const formattedTitle = title ? TikTokService.formatContent(title) : '';
    const formattedDescription = description ? TikTokService.formatContent(description) : '';

    // Create TikTok service
    const tiktokService = new TikTokService(accessToken);

    try {
      console.log('Creating TikTok photo post:', {
        photoCount: photoUrls.length,
        photoCoverIndex: photoCoverIndex || 0,
        privacyLevel: privacyLevel || 'PUBLIC_TO_EVERYONE',
        hasTitle: !!formattedTitle,
        hasDescription: !!formattedDescription
      });

      // Convert photo URLs to use media proxy to avoid URL ownership verification issues
      // TikTok requires domain ownership verification for PULL_FROM_URL
      // Using our media proxy ensures the URLs are from a domain we control
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app';
      const proxyPhotoUrls = photoUrls.map((url: string) =>
        `${baseUrl}/api/media/proxy?url=${encodeURIComponent(url)}`
      );

      console.log('Using media proxy for photo URLs to avoid ownership verification issues');

      // Call photo posting method with proxied URLs
      const result = await tiktokService.createPhotoPost(
        formattedTitle,
        formattedDescription,
        proxyPhotoUrls,
        photoCoverIndex || 0,
        privacyLevel || 'PUBLIC_TO_EVERYONE',
        {
          disableComment: options?.disableComment || false,
          autoAddMusic: options?.autoAddMusic || false,
          brandContentToggle: options?.brandContentToggle || false,
          brandOrganicToggle: options?.brandOrganicToggle || false,
        }
      );

      console.log('TikTok photo post result:', result);

      // Return success response
      return NextResponse.json({
        success: result.success,
        sandbox: result.sandbox,
        publishId: result.publishId,
        message: result.message || 'TikTok photo post initiated successfully',
      });

    } catch (postError: any) {
      console.error('TikTok photo posting error:', postError);

      // Check for specific error types
      if (postError.message.includes('401') || postError.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'TikTok authentication failed. Please reconnect your account.',
            details: postError.message
          },
          { status: 401 }
        );
      }

      if (postError.message.includes('photo') || postError.message.includes('image')) {
        return NextResponse.json(
          {
            error: 'Photo upload failed. Please ensure photos meet TikTok requirements.',
            details: postError.message
          },
          { status: 400 }
        );
      }

      if (postError.message.includes('quota') || postError.message.includes('limit')) {
        return NextResponse.json(
          {
            error: 'Posting limit reached. Please try again later.',
            details: postError.message
          },
          { status: 429 }
        );
      }

      throw postError;
    }

  } catch (error) {
    console.error('TikTok photo posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post photos to TikTok' },
      { status: 500 }
    );
  }
}
