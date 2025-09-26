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
        // Get posts from the page
        const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url&since=${sinceTimestamp}&limit=100&access_token=${account.access_token}`;
        const postsResponse = await fetchWithTimeout(postsUrl, 10000); // 10 second timeout
        
        if (!postsResponse.ok) {
          console.error(`Failed to fetch Facebook posts for account ${account.id}`);
          continue;
        }

        const postsData = await postsResponse.json();
        const allPosts = postsData.data || [];
        
        console.log(`[Facebook Analytics] Found ${allPosts.length} posts for ${days} day period`);
        
        // For 7-day queries: process all posts with full insights
        if (days <= 7) {
          // Process all posts with full engagement and insights
          const postPromises = allPosts.map(async (post: any) => {
            try {
              // Get engagement data
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

              // Get insights for all posts in 7-day range
              let reach = 0, impressions = 0;
              try {
                const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_impressions_unique&access_token=${account.access_token}`;
                const insightsResponse = await fetchWithTimeout(insightsUrl, 3000);
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'post_impressions' && metric.values?.[0]) {
                        impressions = metric.values[0].value || 0;
                      }
                      if (metric.name === 'post_impressions_unique' && metric.values?.[0]) {
                        reach = metric.values[0].value || 0;
                      }
                    });
                  }
                }
              } catch (insightsError) {
                console.log(`Insights not available for post ${post.id}`);
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
            }
          });
        } else {
          // For 30/90 day queries: Two-pass approach
          // Pass 1: Get basic engagement for ALL posts
          console.log(`[Facebook Analytics] Pass 1: Getting engagement for all ${allPosts.length} posts`);
          
          const postsWithEngagement = await Promise.all(
            allPosts.map(async (post: any) => {
              try {
                const engagementUrl = `https://graph.facebook.com/v21.0/${post.id}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${account.access_token}`;
                const engagementResponse = await fetchWithTimeout(engagementUrl, 3000); // Quick timeout
                
                let totalEngagement = 0;
                if (engagementResponse.ok) {
                  const engagementData = await engagementResponse.json();
                  const likes = engagementData.likes?.summary?.total_count || 0;
                  const comments = engagementData.comments?.summary?.total_count || 0;
                  const shares = engagementData.shares?.count || 0;
                  const reactions = engagementData.reactions?.summary?.total_count || 0;
                  totalEngagement = likes + comments + shares + reactions;
                  
                  return {
                    ...post,
                    likes,
                    comments,
                    shares,
                    reactions,
                    totalEngagement
                  };
                }
                return { ...post, totalEngagement: 0 };
              } catch (error) {
                console.log(`Failed to get engagement for post ${post.id}`);
                return { ...post, totalEngagement: 0 };
              }
            })
          );
          
          // Sort by engagement and take top 10
          const topPosts = postsWithEngagement
            .sort((a, b) => b.totalEngagement - a.totalEngagement)
            .slice(0, 10);
          
          console.log(`[Facebook Analytics] Pass 2: Getting insights for top ${topPosts.length} posts by engagement`);
          
          // Pass 2: Get detailed insights only for top 10 posts
          const detailedPostPromises = topPosts.map(async (post: any, index: number) => {
            let reach = 0, impressions = 0;
            
            // Get insights for top 5 posts only
            if (index < 5) {
              try {
                const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_impressions_unique&access_token=${account.access_token}`;
                const insightsResponse = await fetchWithTimeout(insightsUrl, 3000);
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'post_impressions' && metric.values?.[0]) {
                        impressions = metric.values[0].value || 0;
                      }
                      if (metric.name === 'post_impressions_unique' && metric.values?.[0]) {
                        reach = metric.values[0].value || 0;
                      }
                    });
                  }
                }
              } catch (insightsError) {
                console.log(`Insights not available for post ${post.id}`);
              }
            }
            
            return {
              id: post.id,
              message: post.message,
              created_time: post.created_time,
              permalink_url: post.permalink_url,
              likes: post.likes || 0,
              comments: post.comments || 0,
              shares: post.shares || 0,
              reactions: post.reactions || 0,
              reach,
              impressions
            };
          });
          
          const detailedPosts = await Promise.all(detailedPostPromises);
          detailedPosts.forEach(postMetrics => {
            if (postMetrics) {
              allMetrics.posts.push(postMetrics);
              allMetrics.totalPosts++;
              allMetrics.totalEngagement += postMetrics.likes + postMetrics.comments + postMetrics.shares;
              allMetrics.totalReach += postMetrics.reach;
              allMetrics.totalImpressions += postMetrics.impressions;
            }
          });
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