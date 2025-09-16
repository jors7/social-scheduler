import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidThreadsToken } from '@/lib/threads/token-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const metricType = searchParams.get('type') || 'profile'; // 'profile' or 'posts'

    // Get Threads account with automatic token refresh
    const { token: accessToken, account, error: tokenError } = await getValidThreadsToken(accountId || undefined);
    
    if (tokenError || !accessToken) {
      console.error('Failed to get valid token:', tokenError);
      return NextResponse.json(
        { 
          error: tokenError || 'Threads account not connected',
          needsReconnect: tokenError?.includes('reconnect') || false
        },
        { status: 404 }
      );
    }

    if (metricType === 'profile') {
      // Fetch profile insights
      // Get user profile - Note: follower_count and following_count are not available via API
      const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
      
      console.log('Fetching Threads profile insights');
      
      const profileResponse = await fetch(profileUrl);
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        console.error('Failed to fetch profile insights:', errorData);
        
        return NextResponse.json(
          { 
            error: errorData.error?.message || 'Failed to fetch profile insights',
            details: errorData.error 
          },
          { status: 400 }
        );
      }

      const profileData = await profileResponse.json();
      
      // Get recent posts to calculate engagement rates
      // Note: We need to fetch posts first, then get insights separately
      const postsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id&limit=25&access_token=${accessToken}`;
      const postsResponse = await fetch(postsUrl);
      
      let totalEngagement = 0;
      let totalViews = 0;
      let postCount = 0;
      
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        if (postsData.data && Array.isArray(postsData.data)) {
          // For each post, fetch insights separately
          for (const post of postsData.data) {
            try {
              const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
              const insightsResponse = await fetch(insightsUrl);
              
              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                
                // Parse metrics from insights response
                if (insightsData.data && Array.isArray(insightsData.data)) {
                  let postViews = 0;
                  let postEngagement = 0;
                  
                  insightsData.data.forEach((metric: any) => {
                    const value = metric.values?.[0]?.value || 0;
                    if (metric.name === 'views') {
                      postViews = value;
                    } else if (['likes', 'replies', 'reposts', 'quotes'].includes(metric.name)) {
                      postEngagement += value;
                    }
                  });
                  
                  totalViews += postViews;
                  totalEngagement += postEngagement;
                  postCount++;
                }
              }
            } catch (error) {
              console.error(`Error fetching insights for post ${post.id}:`, error);
            }
          }
        }
      }
      
      // Calculate averages and rates
      const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
      const avgViewsPerPost = postCount > 0 ? Math.round(totalViews / postCount) : 0;
      const avgEngagementPerPost = postCount > 0 ? Math.round(totalEngagement / postCount) : 0;
      
      return NextResponse.json({
        success: true,
        profile: {
          id: profileData.id,
          username: profileData.username,
          profilePicture: profileData.threads_profile_picture_url,
          biography: profileData.threads_biography,
          followerCount: 0, // Not available via API
          followingCount: 0, // Not available via API
          metrics: {
            totalViews,
            totalEngagement,
            postCount,
            avgEngagementRate: avgEngagementRate.toFixed(2),
            avgViewsPerPost,
            avgEngagementPerPost
          }
        },
        account: {
          id: account.id,
          username: account.username || account.platform_user_id
        }
      });
      
    } else if (metricType === 'posts') {
      // Fetch detailed post insights
      const limit = searchParams.get('limit') || '10';
      const postsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,permalink,timestamp,media_type&limit=${limit}&access_token=${accessToken}`;
      
      const postsResponse = await fetch(postsUrl);
      
      if (!postsResponse.ok) {
        const errorData = await postsResponse.json();
        return NextResponse.json(
          { 
            error: errorData.error?.message || 'Failed to fetch posts insights',
            details: errorData.error 
          },
          { status: 400 }
        );
      }
      
      const postsData = await postsResponse.json();
      
      // Fetch metrics for each post separately
      const postsWithMetrics = await Promise.all(
        (postsData.data || []).map(async (post: any) => {
          try {
            const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
            const insightsResponse = await fetch(insightsUrl);
            
            let metrics = {
              views: 0,
              likes: 0,
              replies: 0,
              reposts: 0,
              quotes: 0,
              engagement: 0,
              engagementRate: '0.00'
            };
            
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              
              // Parse metrics from insights response
              if (insightsData.data && Array.isArray(insightsData.data)) {
                insightsData.data.forEach((metric: any) => {
                  const value = metric.values?.[0]?.value || 0;
                  if (metric.name in metrics) {
                    metrics[metric.name as keyof typeof metrics] = value;
                  }
                });
                
                // Calculate engagement
                metrics.engagement = metrics.likes + metrics.replies + metrics.reposts + metrics.quotes;
                const engagementRate = metrics.views > 0 ? (metrics.engagement / metrics.views) * 100 : 0;
                metrics.engagementRate = engagementRate.toFixed(2);
              }
            }
            
            return {
              ...post,
              metrics
            };
          } catch (error) {
            console.error(`Error fetching insights for post ${post.id}:`, error);
            return {
              ...post,
              metrics: {
                views: 0,
                likes: 0,
                replies: 0,
                reposts: 0,
                quotes: 0,
                engagement: 0,
                engagementRate: '0.00'
              }
            };
          }
        })
      );
      
      return NextResponse.json({
        success: true,
        posts: postsWithMetrics,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    
  } catch (error) {
    console.error('Threads insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Threads insights' },
      { status: 500 }
    );
  }
}