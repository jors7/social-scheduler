import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
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

interface FacebookMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  posts: Array<{
    id: string;
    message?: string;
    created_time: string;
    permalink_url?: string;
    likes: number;
    comments: number;
    shares: number;
    reactions: number;
    reach: number;
    impressions: number;
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
    const sinceTimestamp = Math.floor(since.getTime() / 1000);

    // Get Facebook accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ 
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalImpressions: 0,
          posts: []
        }
      });
    }

    const allMetrics: FacebookMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalImpressions: 0,
      posts: []
    };

    // Fetch data for each Facebook page
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get posts from the page - REMOVE since parameter to match working insights endpoint
        // The issue: Facebook insights may not be available for posts fetched with date filters
        const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url&limit=25&access_token=${account.access_token}`;
        console.log(`[Facebook Analytics] Fetching posts from: ${account.platform_user_id}`);
        const postsResponse = await fetchWithTimeout(postsUrl, 10000); // 10 second timeout

        if (!postsResponse.ok) {
          console.error(`Failed to fetch Facebook posts for account ${account.id}`);
          continue;
        }

        const postsData = await postsResponse.json();
        let allPosts = postsData.data || [];

        // Filter posts by date on our side
        const filteredPosts = allPosts.filter((post: any) => {
          const postTime = new Date(post.created_time).getTime() / 1000;
          return postTime >= sinceTimestamp;
        });

        console.log(`[Facebook Analytics] Found ${allPosts.length} total posts, ${filteredPosts.length} within ${days} day period`);
        allPosts = filteredPosts;

        // Fetch video data separately to get view counts (Meta's replacement for post_impressions)
        const videosUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,views&limit=25&access_token=${account.access_token}`;
        console.log(`[Facebook Analytics] Fetching videos with view counts from: ${account.platform_user_id}`);
        const videosResponse = await fetchWithTimeout(videosUrl, 10000);

        // Create a map of video IDs to view counts
        const videoViewsMap = new Map();
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          videosData.data?.forEach((video: any) => {
            videoViewsMap.set(video.id, video.views || 0);
            console.log(`[Facebook Analytics] Video ${video.id}: ${video.views || 0} views`);
          });
          console.log(`[Facebook Analytics] Found ${videoViewsMap.size} videos with view data`);
        } else {
          console.log(`[Facebook Analytics] Videos endpoint not accessible (may not have permission or no videos exist)`);
        }

        // Process all posts - NOTE: post_impressions/post_impressions_unique metrics are DEPRECATED by Meta
        // We now use video views for video content. Page-level reach/impressions still work for regular posts.
        const postPromises = allPosts.map(async (post: any) => {
            try {
              // Get engagement data - this still works fine
              const engagementUrl = `https://graph.facebook.com/v21.0/${post.id}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${account.access_token}`;
              const engagementResponse = await fetchWithTimeout(engagementUrl, 5000);

              let likes = 0, comments = 0, shares = 0, reactions = 0;

              if (engagementResponse.ok) {
                const engagementData = await engagementResponse.json();
                likes = engagementData.likes?.summary?.total_count || 0;
                comments = engagementData.comments?.summary?.total_count || 0;
                shares = engagementData.shares?.count || 0;
                reactions = engagementData.reactions?.summary?.total_count || 0;
              }

              // Check if this post has video views data (Meta's replacement for post_impressions)
              const videoViews = videoViewsMap.get(post.id) || null;

              return {
                id: post.id,
                message: post.message,
                created_time: post.created_time,
                permalink_url: post.permalink_url,
                likes,
                comments,
                shares,
                reactions,
                reach: null, // No longer available for regular posts
                impressions: videoViews, // Use video views if available, otherwise null
                views: videoViews, // Track views separately for clarity
                totalEngagement: likes + comments + shares + reactions
              };
            } catch (error) {
              console.error(`Error fetching metrics for post ${post.id}:`, error);
              return null;
            }
          });
          
          const postResults = await Promise.all(postPromises);
          let totalVideoViews = 0;
          postResults.forEach(postMetrics => {
            if (postMetrics) {
              allMetrics.posts.push(postMetrics);
              allMetrics.totalPosts++;
              allMetrics.totalEngagement += postMetrics.totalEngagement;
              // Aggregate video views as impressions
              if (postMetrics.views) {
                totalVideoViews += postMetrics.views;
                console.log(`[Facebook Analytics] Added video views from post ${postMetrics.id}: ${postMetrics.views}`);
              }
            }
          });

          console.log(`[Facebook Analytics] ============ POST-LEVEL TOTALS ============`);
          console.log(`[Facebook Analytics] Total Posts: ${allMetrics.totalPosts}`);
          console.log(`[Facebook Analytics] Total Engagement: ${allMetrics.totalEngagement}`);
          console.log(`[Facebook Analytics] Total Video Views: ${totalVideoViews}`);
          console.log(`[Facebook Analytics] ==============================================`);

          // Fetch page-level metrics using NEW page_media_view API (replaces deprecated page_impressions)
          // Meta deprecated page_impressions on November 15, 2025 - page_media_view is the official replacement
          try {
            console.log(`[Facebook Analytics] Fetching page-level metrics using new page_media_view API (Meta v24.0+)`);

            const period = 'day';
            let pageMediaViews = 0;

            try {
              // Use page_media_view (official replacement for page_impressions as of Nov 2025)
              const mediaViewUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/insights?metric=page_media_view&period=${period}&since=${sinceTimestamp}&access_token=${account.access_token}`;
              const response = await fetchWithTimeout(mediaViewUrl, 5000);

              if (response.ok) {
                const data = await response.json();

                if (data.data && data.data[0] && data.data[0].values) {
                  // Sum up all values in the period
                  pageMediaViews = data.data[0].values.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                  console.log(`[Facebook Analytics] Page media views (non-video content): ${pageMediaViews}`);
                }
              } else {
                const errorText = await response.text();
                console.error(`[Facebook Analytics] Failed to fetch page_media_view:`, errorText);
              }
            } catch (metricError) {
              console.error(`[Facebook Analytics] Error fetching page_media_view:`, metricError);
            }

            // page_media_view represents unique views (equivalent to old page_impressions_unique)
            allMetrics.totalReach = pageMediaViews; // Use media views as reach
            allMetrics.totalImpressions = pageMediaViews + totalVideoViews; // Combine page views + video views

            console.log(`[Facebook Analytics] ============ FINAL TOTALS ============`);
            console.log(`[Facebook Analytics] Page Media Views (non-video): ${pageMediaViews}`);
            console.log(`[Facebook Analytics] Video Views: ${totalVideoViews}`);
            console.log(`[Facebook Analytics] Combined Total Views: ${allMetrics.totalImpressions}`);
            console.log(`[Facebook Analytics] Total Reach: ${allMetrics.totalReach}`);
            console.log(`[Facebook Analytics] =======================================`);
          } catch (pageError) {
            console.error(`[Facebook Analytics] Error fetching page-level metrics:`, pageError);
          }

      } catch (error) {
        console.error(`Error fetching data for Facebook account ${account.id}:`, error);
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching Facebook analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook analytics' },
      { status: 500 }
    );
  }
}