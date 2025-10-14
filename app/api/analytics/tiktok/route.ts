import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

interface TikTokMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalViews: number;
  posts: Array<{
    id: string;
    title?: string;
    description?: string;
    created_time: string;
    cover_image_url?: string;
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

    // Get base URL for internal API calls (server-side fetch requires absolute URLs)
    const baseUrl = request.nextUrl.origin;

    // Get TikTok accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalViews: 0,
          posts: []
        }
      });
    }

    const allMetrics: TikTokMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalViews: 0,
      posts: []
    };

    // Fetch data for each TikTok account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Fetch videos using the TikTok API via our media endpoint
        // We'll fetch up to 100 videos to get enough data for the analytics period
        // Use absolute URL for server-side fetch
        const mediaUrl = `${baseUrl}/api/tiktok/media?limit=100&accountId=${account.id}`;

        // Forward authentication cookies for server-side fetch
        const cookieHeader = request.headers.get('cookie');
        const headers: HeadersInit = {};
        if (cookieHeader) {
          headers['Cookie'] = cookieHeader;
        }

        const mediaResponse = await fetchWithTimeout(mediaUrl, 15000, { headers }); // 15 second timeout

        if (!mediaResponse.ok) {
          const errorData = await mediaResponse.json().catch(() => ({}));
          console.error(`[TikTok Analytics] Media endpoint returned error for account ${account.id}:`);
          console.error(`[TikTok Analytics] Full error response:`, JSON.stringify(errorData, null, 2));
          console.error(`[TikTok Analytics] Parsed values:`, {
            status: mediaResponse.status,
            statusText: mediaResponse.statusText,
            error: errorData.error || 'Unknown error',
            tokenExpired: errorData.tokenExpired || false,
            scopeError: errorData.scopeError || false
          });
          continue;
        }

        const mediaData = await mediaResponse.json();
        const videos = mediaData.media || [];

        console.log(`[TikTok Analytics] Found ${videos.length} videos for ${days} day period`);

        // Filter videos by date range
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        videos.forEach((video: any) => {
          const videoDate = new Date(video.created_time);

          // Only include videos within the date range
          if (videoDate >= sinceDate) {
            const likes = video.metrics?.likes || 0;
            const comments = video.metrics?.comments || 0;
            const shares = video.metrics?.shares || 0;
            const views = video.metrics?.views || 0;
            const totalEngagement = likes + comments + shares;

            allMetrics.posts.push({
              id: video.id,
              title: video.title,
              description: video.description,
              created_time: video.created_time,
              cover_image_url: video.cover_image_url,
              likes,
              comments,
              shares,
              views,
              totalEngagement
            });

            allMetrics.totalPosts++;
            allMetrics.totalEngagement += totalEngagement;
            allMetrics.totalViews += views;
            // For TikTok, reach is similar to views
            allMetrics.totalReach += views;
          }
        });

      } catch (error) {
        console.error(`Error fetching data for TikTok account ${account.id}:`, error);
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching TikTok analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TikTok analytics' },
      { status: 500 }
    );
  }
}
