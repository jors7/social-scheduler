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
      isShort = false // New parameter for YouTube Shorts
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

    return NextResponse.json({
      success: true,
      id: result.id,
      url: result.url,
      isShort: isShort,
      message: isShort ? 'YouTube Short uploaded successfully' : 'Video uploaded to YouTube successfully',
    });

  } catch (error) {
    console.error('YouTube posting error:', error);
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