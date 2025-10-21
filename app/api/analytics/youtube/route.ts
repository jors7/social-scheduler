import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserYouTubeService } from '@/lib/youtube/service';

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeout = 10000, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

interface YouTubeMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalViews: number;
  totalImpressions: number;
  posts: Array<{
    id: string;
    title: string;
    description?: string;
    created_time: string;
    thumbnail_url?: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    totalEngagement: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get YouTube accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalViews: 0,
          totalImpressions: 0,
          posts: []
        }
      });
    }

    const allMetrics: YouTubeMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalViews: 0,
      totalImpressions: 0,
      posts: []
    };

    // Fetch data for each YouTube account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get YouTube service instance
        const youtubeService = await getUserYouTubeService(user.id);

        // Refresh token to ensure we have valid credentials
        await youtubeService.refreshAccessToken();

        // Get the user's channel
        const channels = await youtubeService.getChannels();
        if (!channels || channels.length === 0) {
          console.log('[YouTube Analytics] No channels found for user');
          continue;
        }

        const channel = channels[0];
        const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) {
          console.log('[YouTube Analytics] No uploads playlist found');
          continue;
        }

        // Get all videos from the uploads playlist
        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: account.access_token,
          refresh_token: account.refresh_token,
        });

        const youtube = google.youtube({
          version: 'v3',
          auth: oauth2Client,
        });

        // Fetch videos from uploads playlist
        let nextPageToken: string | undefined = undefined;
        const videoIds: string[] = [];

        do {
          const playlistResponse: any = await youtube.playlistItems.list({
            part: ['contentDetails', 'snippet'],
            playlistId: uploadsPlaylistId,
            maxResults: 50,
            pageToken: nextPageToken,
          });

          const items = playlistResponse.data.items || [];

          // Filter videos by date range and collect video IDs
          for (const item of items) {
            const publishedAt = item.snippet?.publishedAt;
            if (publishedAt) {
              const videoDate = new Date(publishedAt);
              if (videoDate >= since) {
                const videoId = item.contentDetails?.videoId;
                if (videoId) {
                  videoIds.push(videoId);
                }
              } else {
                // Videos are ordered by date, so we can stop if we're past the date range
                nextPageToken = undefined;
                break;
              }
            }
          }

          nextPageToken = playlistResponse.data.nextPageToken;
        } while (nextPageToken && videoIds.length < 200); // Limit to 200 videos max

        console.log(`[YouTube Analytics] Found ${videoIds.length} videos in the last ${days} days`);

        // Fetch statistics for all videos in batches of 50 (API limit)
        for (let i = 0; i < videoIds.length; i += 50) {
          const batchIds = videoIds.slice(i, i + 50);

          const videosResponse = await youtube.videos.list({
            part: ['statistics', 'snippet'],
            id: batchIds,
          });

          const videos = videosResponse.data.items || [];

          for (const video of videos) {
            const stats = video.statistics;
            const snippet = video.snippet;

            if (!stats || !snippet) continue;

            const likes = parseInt(stats.likeCount || '0');
            const comments = parseInt(stats.commentCount || '0');
            const views = parseInt(stats.viewCount || '0');
            const shares = 0; // YouTube API doesn't provide share count directly

            const totalEngagement = likes + comments + shares;

            allMetrics.posts.push({
              id: video.id || '',
              title: snippet.title || '',
              description: snippet.description || undefined,
              created_time: snippet.publishedAt || '',
              thumbnail_url: snippet.thumbnails?.medium?.url || undefined,
              likes,
              comments,
              shares,
              views,
              totalEngagement
            });

            allMetrics.totalPosts++;
            allMetrics.totalEngagement += totalEngagement;
            allMetrics.totalViews += views;
            allMetrics.totalReach += views; // For YouTube, reach = views
            allMetrics.totalImpressions += views; // For YouTube, impressions = views
          }
        }

      } catch (error: any) {
        console.error(`Error fetching data for YouTube account ${account.id}:`, error);

        // Handle specific YouTube API errors
        if (error.message?.includes('quota')) {
          console.error('[YouTube Analytics] API quota exceeded');
        } else if (error.message?.includes('authentication')) {
          console.error('[YouTube Analytics] Authentication error - token may be expired');
        }
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching YouTube analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube analytics' },
      { status: 500 }
    );
  }
}
