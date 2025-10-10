import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '5');
    const accountId = searchParams.get('accountId');

    // Get TikTok account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'TikTok account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    console.log(`[TikTok Media] Fetching videos for account:`, {
      accountId: account.id,
      username: account.username,
      limit
    });

    // Fetch videos from TikTok API using video.list scope
    const videosUrl = `https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link,like_count,comment_count,share_count,view_count,create_time`;

    const videosResponse = await fetch(videosUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_count: limit
      })
    });

    if (!videosResponse.ok) {
      const errorData = await videosResponse.json();
      console.error(`[${account.display_name || account.username}] Failed to fetch TikTok videos:`, errorData);

      // Check for token expiration or scope issues
      if (errorData.error?.code === 'access_token_invalid' || errorData.error?.message?.includes('token')) {
        return NextResponse.json(
          { error: 'TikTok token expired', tokenExpired: true },
          { status: 401 }
        );
      }

      if (errorData.error?.code === 'scope_not_authorized' || errorData.error?.message?.includes('scope')) {
        return NextResponse.json(
          { error: 'Missing video.list permission. Please reconnect your TikTok account.', scopeError: true },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch TikTok videos' },
        { status: videosResponse.status }
      );
    }

    const videosData = await videosResponse.json();
    const videos = videosData.data?.videos || [];

    console.log(`[${account.display_name || account.username}] Fetched ${videos.length} TikTok videos`);

    // Format videos to match the structure expected by the UI
    const formattedVideos = videos.map((video: any) => ({
      id: video.id,
      title: video.title || '',
      description: video.video_description || '',
      duration: video.duration || 0,
      cover_image_url: video.cover_image_url || '',
      embed_link: video.embed_link || '',
      created_time: video.create_time ? new Date(video.create_time * 1000).toISOString() : new Date().toISOString(),
      metrics: {
        views: video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
      }
    }));

    // Calculate total engagement for sorting
    const videosWithEngagement = formattedVideos.map((video: any) => ({
      ...video,
      totalEngagement: (video.metrics.likes || 0) + (video.metrics.comments || 0) + (video.metrics.shares || 0)
    }));

    // Sort by engagement (highest first)
    videosWithEngagement.sort((a: any, b: any) => b.totalEngagement - a.totalEngagement);

    return NextResponse.json({
      success: true,
      media: videosWithEngagement,
      account: {
        id: account.id,
        username: account.username || account.platform_user_id,
        display_name: account.display_name
      },
      has_more: videos.length >= limit
    });

  } catch (error) {
    console.error('Error fetching TikTok media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok media' },
      { status: 500 }
    );
  }
}
