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
      categoryId 
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
    const youtubeService = new YouTubeService(account.access_token, account.refresh_token);

    // Note: Actual video upload would require handling file streams
    // This is a simplified version for demonstration
    const result = await youtubeService.uploadVideo({
      title: formattedContent.title,
      description: formattedContent.description,
      tags: tags || formattedContent.tags,
      categoryId: categoryId,
      privacyStatus: privacyStatus as 'private' | 'public' | 'unlisted',
      videoPath: videoUrl, // This would need proper implementation
      thumbnailPath: thumbnailUrl,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      url: result.url,
      message: 'Video uploaded to YouTube successfully',
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