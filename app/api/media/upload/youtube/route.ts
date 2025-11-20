import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { YouTubeService } from '@/lib/youtube/service';
import { validateVideoFile, formatFileSize } from '@/lib/youtube/upload';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for upload

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get YouTube account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not connected. Please reconnect your YouTube account in Settings.' },
        { status: 400 }
      );
    }

    // Check if we have a refresh token
    if (!account.refresh_token) {
      console.error('No refresh token for YouTube account');
      return NextResponse.json(
        { error: 'YouTube authentication expired. Please reconnect your YouTube account in Settings.' },
        { status: 401 }
      );
    }

    // Parse JSON body with R2 URLs
    const body = await request.json();
    const {
      videoUrl,
      thumbnailUrl,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      publishAt
    } = body;

    // Validate required fields
    if (!videoUrl || !title) {
      return NextResponse.json(
        { error: 'Video URL and title are required' },
        { status: 400 }
      );
    }

    console.log('Fetching video from R2:', videoUrl);

    // Fetch video from R2
    let videoBuffer: Buffer;
    let videoSize: number;
    let videoType: string;

    try {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video from R2: ${videoResponse.statusText}`);
      }

      videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      videoSize = videoBuffer.length;
      videoType = videoResponse.headers.get('content-type') || 'video/mp4';

      console.log('Video fetched from R2:', {
        size: formatFileSize(videoSize),
        type: videoType
      });
    } catch (fetchError: any) {
      console.error('Error fetching video from R2:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch video from storage: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Validate video file
    const validation = validateVideoFile({
      type: videoType,
      size: videoSize,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    console.log('Uploading video to YouTube:', {
      title,
      fileSize: formatFileSize(videoSize),
      mimeType: videoType,
    });

    // Fetch thumbnail if provided
    let thumbnailBuffer: Buffer | undefined;
    if (thumbnailUrl) {
      try {
        const thumbnailResponse = await fetch(thumbnailUrl);
        if (!thumbnailResponse.ok) {
          console.error('Failed to fetch thumbnail from R2:', thumbnailResponse.statusText);
        } else {
          const thumbnailArrayBuffer = await thumbnailResponse.arrayBuffer();
          const thumbnailSize = thumbnailArrayBuffer.byteLength;
          const thumbnailType = thumbnailResponse.headers.get('content-type') || '';

          // Validate thumbnail (max 2MB, must be image)
          if (!thumbnailType.startsWith('image/')) {
            console.error('Thumbnail is not an image type:', thumbnailType);
          } else if (thumbnailSize > 2 * 1024 * 1024) {
            console.error('Thumbnail is too large:', formatFileSize(thumbnailSize));
          } else {
            thumbnailBuffer = Buffer.from(thumbnailArrayBuffer);
            console.log('Thumbnail fetched from R2:', {
              size: formatFileSize(thumbnailSize),
              type: thumbnailType
            });
          }
        }
      } catch (thumbnailError: any) {
        console.error('Error fetching thumbnail from R2:', thumbnailError);
        // Continue without thumbnail
      }
    }

    // Parse tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;

    // Create YouTube service with user ID for token refresh
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token, user.id);

    // Refresh the access token before uploading to ensure it's valid
    // This prevents 401 errors from expired tokens
    try {
      await youtubeService.refreshAccessToken();
      console.log('Token refreshed successfully before upload');
    } catch (refreshError: any) {
      console.error('Token refresh failed:', refreshError);
      return NextResponse.json(
        { error: 'YouTube authentication expired. Please reconnect your YouTube account in Settings.' },
        { status: 401 }
      );
    }

    // Validate and ensure categoryId is a string
    const validCategoryId = categoryId && categoryId.trim() ? categoryId.trim() : '22';
    console.log('Using YouTube categoryId:', validCategoryId);

    // Upload video
    const result = await youtubeService.uploadVideo({
      title,
      description: description || '',
      tags: tagArray,
      categoryId: validCategoryId, // Default to People & Blogs
      privacyStatus: privacyStatus || 'private',
      publishAt: publishAt || undefined,
      videoBuffer,
      thumbnailBuffer,
    });

    // Store upload record in database
    await supabase
      .from('youtube_uploads')
      .insert({
        user_id: user.id,
        video_id: result.id,
        title: result.title,
        description: result.description,
        url: result.url,
        status: result.status?.privacyStatus,
        uploaded_at: new Date().toISOString(),
      })
      .single();

    return NextResponse.json({
      success: true,
      video: {
        id: result.id,
        url: result.url,
        title: result.title,
        description: result.description,
        status: result.status,
      },
      message: 'Video uploaded to YouTube successfully',
    });

  } catch (error: any) {
    console.error('YouTube upload error:', error);
    
    // Check for authentication errors
    if (error?.response?.status === 401 || error?.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'YouTube authentication expired. Please reconnect your YouTube account in Settings.' },
        { status: 401 }
      );
    }
    
    // Check for invalid credentials error
    if (error?.message?.includes('invalid_grant') || error?.message?.includes('Token has been expired or revoked')) {
      return NextResponse.json(
        { error: 'YouTube access has been revoked. Please reconnect your YouTube account in Settings.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video to YouTube' },
      { status: 500 }
    );
  }
}

// GET endpoint to check upload status or get video details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get current user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get YouTube account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'YouTube account not connected' },
        { status: 400 }
      );
    }

    // Create YouTube service and get video details
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token);
    
    // This would need implementation in the YouTubeService class
    // For now, return a placeholder
    return NextResponse.json({
      success: true,
      video: {
        id: videoId,
        status: 'processing',
      },
    });

  } catch (error) {
    console.error('Error checking YouTube video:', error);
    return NextResponse.json(
      { error: 'Failed to get video details' },
      { status: 500 }
    );
  }
}