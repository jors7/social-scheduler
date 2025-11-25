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

        // Process all posts with full engagement and insights regardless of date range
        const postPromises = allPosts.map(async (post: any) => {
            try {
              // Get engagement data AND insights in the initial fetch to reduce API calls
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

              // Try to get insights
              let reach = 0, impressions = 0;
              try {
                const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_impressions_unique&access_token=${account.access_token}`;
                const insightsResponse = await fetchWithTimeout(insightsUrl, 3000);

                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  console.log(`[Facebook Analytics] Post ${post.id} insights response:`, JSON.stringify(insightsData, null, 2));
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'post_impressions' && metric.values?.[0]) {
                        impressions = metric.values[0].value || 0;
                        console.log(`[Facebook Analytics] Post ${post.id} - Got impressions: ${impressions}`);
                      }
                      if (metric.name === 'post_impressions_unique' && metric.values?.[0]) {
                        reach = metric.values[0].value || 0;
                        console.log(`[Facebook Analytics] Post ${post.id} - Got reach: ${reach}`);
                      }
                    });
                  }
                } else {
                  const errorText = await insightsResponse.text();
                  console.error(`[Facebook Analytics] Insights API failed for post ${post.id}:`, errorText);
                }
              } catch (insightsError) {
                console.error(`[Facebook Analytics] Exception fetching insights for post ${post.id}:`, insightsError);
              }

              return {
                id: post.id,
                message: post.message,
                created_time: post.created_time,
                permalink_url: post.permalink_url,
                likes,
                comments,
                shares,
                reactions,
                reach,
                impressions,
                totalEngagement: likes + comments + shares + reactions
              };
            } catch (error) {
              console.error(`Error fetching metrics for post ${post.id}:`, error);
              return null;
            }
          });
          
          const postResults = await Promise.all(postPromises);
          postResults.forEach(postMetrics => {
            if (postMetrics) {
              allMetrics.posts.push(postMetrics);
              allMetrics.totalPosts++;
              allMetrics.totalEngagement += postMetrics.totalEngagement;
              allMetrics.totalReach += postMetrics.reach;
              allMetrics.totalImpressions += postMetrics.impressions;
              console.log(`[Facebook Analytics] Added post ${postMetrics.id}: reach=${postMetrics.reach}, impressions=${postMetrics.impressions}`);
            }
          });

          console.log(`[Facebook Analytics] ============ FINAL TOTALS FOR ACCOUNT ============`);
          console.log(`[Facebook Analytics] Total Posts: ${allMetrics.totalPosts}`);
          console.log(`[Facebook Analytics] Total Engagement: ${allMetrics.totalEngagement}`);
          console.log(`[Facebook Analytics] Total Reach: ${allMetrics.totalReach}`);
          console.log(`[Facebook Analytics] Total Impressions: ${allMetrics.totalImpressions}`);
          console.log(`[Facebook Analytics] ==================================================`);
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