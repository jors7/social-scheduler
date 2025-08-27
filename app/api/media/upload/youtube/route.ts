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
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'YouTube account not connected' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const categoryId = formData.get('categoryId') as string | null;
    const privacyStatus = formData.get('privacyStatus') as 'private' | 'public' | 'unlisted';

    // Validate required fields
    if (!videoFile || !title) {
      return NextResponse.json(
        { error: 'Video file and title are required' },
        { status: 400 }
      );
    }

    // Validate video file
    const validation = validateVideoFile({
      type: videoFile.type,
      size: videoFile.size,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    console.log('Uploading video to YouTube:', {
      title,
      fileSize: formatFileSize(videoFile.size),
      mimeType: videoFile.type,
    });

    // Convert File to Buffer
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    
    // Convert thumbnail if provided
    let thumbnailBuffer: Buffer | undefined;
    if (thumbnailFile) {
      // Validate thumbnail (max 2MB, must be image)
      if (!thumbnailFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Thumbnail must be an image file' },
          { status: 400 }
        );
      }
      if (thumbnailFile.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Thumbnail must be less than 2MB' },
          { status: 400 }
        );
      }
      thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    }

    // Parse tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined;

    // Create YouTube service
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token);

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

  } catch (error) {
    console.error('YouTube upload error:', error);
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