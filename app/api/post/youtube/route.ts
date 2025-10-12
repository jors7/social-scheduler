import { NextRequest, NextResponse } from 'next/server';
import { YouTubeService, formatYouTubeContent } from '@/lib/youtube/service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('YouTube POST request body:', body);
    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      tags,
      privacyStatus = 'private',
      categoryId,
      publishAt, // ISO 8601 datetime for scheduled publishing
      isShort = false, // New parameter for YouTube Shorts
      userId // User ID for thumbnail upload
    } = body;

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

    // Check if we have a refresh token
    if (!account.refresh_token) {
      console.error('No refresh token for YouTube account');
      return NextResponse.json(
        { error: 'YouTube authentication expired. Please reconnect your YouTube account in Settings.' },
        { status: 401 }
      );
    }

    // For text posts without video, YouTube doesn't support regular posts
    // Only Community posts are available for select channels
    if (!videoUrl) {
      return NextResponse.json(
        { 
          error: 'YouTube requires a video to create a post. Text-only posts (Community posts) require special channel eligibility.',
          info: 'To post on YouTube, please upload a video or create a YouTube Short.'
        },
        { status: 400 }
      );
    }

    // Format content for YouTube
    const formattedContent = formatYouTubeContent(description || '', title);

    // Create YouTube service
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token, user.id);

    // Upload video from URL (either as Short or regular video)
    let result;
    if (isShort) {
      console.log('Uploading YouTube Short...');
      result = await youtubeService.uploadShortFromUrl(videoUrl, {
        title: formattedContent.title,
        description: formattedContent.description,
        tags: tags || formattedContent.tags,
        privacyStatus: privacyStatus as 'private' | 'public' | 'unlisted',
        publishAt: publishAt,
        thumbnailUrl: thumbnailUrl,
      });
    } else {
      console.log('Uploading regular YouTube video...');
      result = await youtubeService.uploadVideoFromUrl(videoUrl, {
        title: formattedContent.title,
        description: formattedContent.description,
        tags: tags || formattedContent.tags,
        categoryId: categoryId,
        privacyStatus: privacyStatus as 'private' | 'public' | 'unlisted',
        publishAt: publishAt,
        thumbnailUrl: thumbnailUrl,
      });
    }

    // For YouTube videos, use the original video URL as the thumbnail
    // The UI will handle rendering it correctly with <video> tag and preload="metadata"
    const thumbnailUrlForUI = videoUrl;

    return NextResponse.json({
      success: true,
      id: result.id,
      url: result.url,
      isShort: isShort,
      thumbnailUrl: thumbnailUrlForUI, // Return video URL to be used as thumbnail in UI
      message: isShort ? 'YouTube Short uploaded successfully' : 'Video uploaded to YouTube successfully',
    });

  } catch (error: any) {
    console.error('YouTube posting error:', error);

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
      { error: error instanceof Error ? error.message : 'Failed to post to YouTube' },
      { status: 500 }
    );
  }
}

// Get YouTube channels for the user
export async function GET(request: NextRequest) {
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

    // Get channels from YouTube
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token);
    const channels = await youtubeService.getChannels();

    return NextResponse.json({
      success: true,
      channels: channels.map((channel: any) => ({
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
      })),
    });

  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube channels' },
      { status: 500 }
    );
  }
}