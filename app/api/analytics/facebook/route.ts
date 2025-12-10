import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { daysAgoUTC } from '@/lib/utils';
import { monitorAPIResponse } from '@/lib/api-monitor';

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
    const since = daysAgoUTC(days); // Normalized to UTC start of day
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
        // Get posts from the page
        // IMPORTANT: Do NOT include likes.summary, comments.summary, etc. for Instagram cross-posted content
        // These fields cause Facebook to EXCLUDE Instagram cross-posts from the response entirely
        const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url,shares&limit=100&access_token=${account.access_token}`;
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

        // Process all posts - NOTE: post_impressions/post_impressions_unique metrics are DEPRECATED by Meta as of Nov 2025
        // We now use post_media_view for ALL posts (Meta's official replacement)
        // For videos, we also fetch from /videos endpoint as a fallback/preference
        // IMPORTANT: We don't include likes/comments in batch fetch because it excludes Instagram cross-posts
        const postPromises = allPosts.map(async (post: any) => {
            try {
              // For Instagram cross-posts, likes/comments fields cause the post to be excluded
              // So we only have shares from batch fetch, and we'll get views from insights API
              const shares = post.shares?.count ?? 0;
              const likes = 0; // Not available for Instagram cross-posts
              const comments = 0;
              const reactions = 0;

              // Fetch post-level views using post_media_view metric (Meta's replacement for post_impressions)
              let postViews = null;
              try {
                const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_media_view&access_token=${account.access_token}`;
                const insightsResponse = await fetchWithTimeout(insightsUrl, 5000);

                // Monitor API response for deprecation warnings
                monitorAPIResponse('facebook', `/v21.0/${post.id}/insights`, insightsResponse.clone(), ['post_media_view']);

                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && insightsData.data[0] && insightsData.data[0].values && insightsData.data[0].values[0]) {
                    postViews = insightsData.data[0].values[0].value || null;
                    console.log(`[Facebook Analytics] Post ${post.id} post_media_view: ${postViews}`);
                  }
                } else {
                  const errorText = await insightsResponse.text();
                  console.log(`[Facebook Analytics] No post_media_view for post ${post.id}: ${errorText.substring(0, 100)}`);
                }
              } catch (insightsError) {
                console.log(`[Facebook Analytics] Error fetching post_media_view for post ${post.id}:`, insightsError);
              }

              // Check if this post has video views data from /videos endpoint
              const videoViews = videoViewsMap.get(post.id) || null;

              // For videos, prefer video endpoint data; for regular posts, use post_media_view
              const finalViews = videoViews || postViews;
              const finalReach = postViews; // post_media_view represents unique views/reach

              return {
                id: post.id,
                message: post.message,
                created_time: post.created_time,
                permalink_url: post.permalink_url,
                likes,
                comments,
                shares,
                reactions,
                reach: finalReach, // Use post_media_view as reach metric
                impressions: finalViews, // Use best available views metric (video views or post_media_view)
                views: finalViews, // Track views separately for clarity
                totalEngagement: likes + comments + shares + reactions
              };
            } catch (error) {
              console.error(`Error fetching metrics for post ${post.id}:`, error);
              return null;
            }
          });
          
          const postResults = await Promise.all(postPromises);
          let totalVideoViews = 0;
          let totalPostReach = 0;
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
              // Aggregate post-level reach
              if (postMetrics.reach) {
                totalPostReach += postMetrics.reach;
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

              // Monitor API response for deprecation warnings
              monitorAPIResponse('facebook', `/v21.0/${account.platform_user_id}/insights`, response.clone(), ['page_media_view']);

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

            // Use post-level reach as primary source (more accurate), fall back to page-level if unavailable
            // Post-level metrics include both video and non-video content
            const calculatedReach = totalPostReach > 0 ? totalPostReach : pageMediaViews;

            allMetrics.totalReach += calculatedReach;
            allMetrics.totalImpressions += calculatedReach;

            console.log(`[Facebook Analytics] ============ FINAL TOTALS ============`);
            console.log(`[Facebook Analytics] Post-Level Reach (aggregated): ${totalPostReach}`);
            console.log(`[Facebook Analytics] Page Media Views (non-video): ${pageMediaViews}`);
            console.log(`[Facebook Analytics] Video Views: ${totalVideoViews}`);
            console.log(`[Facebook Analytics] Final Calculated Reach: ${calculatedReach}`);
            console.log(`[Facebook Analytics] Total Impressions: ${allMetrics.totalImpressions}`);
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