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
    const type = searchParams.get('type') || 'page';
    const period = searchParams.get('period') || 'day';
    const accountId = searchParams.get('accountId');

    // Get Facebook account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);
    
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    if (type === 'page') {
      // Initialize insights object
      const insights: any = {};
      
      // Fetch basic page info first
      const pageInfoUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}?fields=fan_count,name,followers_count,talking_about_count&access_token=${account.access_token}`;
      const pageInfoResponse = await fetch(pageInfoUrl);
      
      if (pageInfoResponse.ok) {
        const pageInfo = await pageInfoResponse.json();
        console.log('Page info:', pageInfo);
        
        insights.fan_count = { value: pageInfo.fan_count || pageInfo.followers_count || 0, previous: 0 };
        insights.page_name = pageInfo.name;
        insights.followers = { value: pageInfo.fan_count || pageInfo.followers_count || 0, previous: 0 };
        
        // talking_about_count can serve as a proxy for engagement
        if (pageInfo.talking_about_count) {
          insights.engagement = { value: pageInfo.talking_about_count, previous: 0 };
        }
      }
      
      // Fetch directly from Facebook API to get real metrics
      let totalImpressions = 0;
      let totalReach = 0;
      let totalEngagement = 0;
      let totalPageViews = 0;
      
      try {
        // Fetch both posts and videos in parallel (videos include reels with view counts)
        const [postsResponse, videosResponse] = await Promise.all([
          fetch(`https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,full_picture,attachments,likes.summary(true),comments.summary(true),shares,reactions.summary(true)&limit=25&access_token=${account.access_token}`),
          fetch(`https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,views,likes.summary(true),comments.summary(true)&limit=25&access_token=${account.access_token}`).catch(() => null)
        ]);
        
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          const posts = postsData.data || [];
          
          console.log(`Fetched ${posts.length} posts from Facebook API`);
          
          // Process each post
          for (const post of posts) {
            // Calculate engagement from the data we already have
            const postEngagement = 
              (post.likes?.summary?.total_count || 0) +
              (post.comments?.summary?.total_count || 0) +
              (post.shares?.count || 0) +
              (post.reactions?.summary?.total_count || 0);
            
            totalEngagement += postEngagement;
            
            // Try to get insights for impressions and reach
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_engaged_users&access_token=${account.access_token}`;
              const insightsResponse = await fetch(insightsUrl);
              
              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                if (insightsData.data && Array.isArray(insightsData.data)) {
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'post_impressions' && metric.values?.[0]) {
                      const value = metric.values[0].value || 0;
                      totalImpressions += value;
                      console.log(`Post ${post.id} impressions: ${value}`);
                    }
                    if (metric.name === 'post_engaged_users' && metric.values?.[0]) {
                      const value = metric.values[0].value || 0;
                      totalReach += value;
                      console.log(`Post ${post.id} reach: ${value}`);
                    }
                  });
                }
              }
            } catch (error) {
              // Insights might fail for some posts, continue with others
            }
          }
        }
        
        // Also process videos if available (they often have view counts)
        if (videosResponse && videosResponse.ok) {
          const videosData = await videosResponse.json();
          const videos = videosData.data || [];
          
          console.log(`Fetched ${videos.length} videos from Facebook API`);
          
          for (const video of videos) {
            // Videos have direct view counts
            if (video.views) {
              totalImpressions += video.views;
              totalReach += Math.floor(video.views * 0.7); // Estimate reach from views
              console.log(`Video ${video.id} views: ${video.views}`);
            }
            
            // Add video engagement
            const videoEngagement = 
              (video.likes?.summary?.total_count || 0) +
              (video.comments?.summary?.total_count || 0);
            
            totalEngagement += videoEngagement;
          }
        }
        
        // Use impressions as proxy for page views
        totalPageViews = Math.floor(totalImpressions * 0.3);
      } catch (error) {
        console.error('Error fetching Facebook posts:', error);
      }
      
      // Log aggregated values for debugging
      console.log('Aggregated metrics from posts:', {
        totalEngagement,
        totalImpressions,
        totalReach,
        totalPageViews
      });
      
      // If we got data from posts, use it to populate insights
      if (totalEngagement > 0 || totalImpressions > 0 || totalReach > 0) {
        // Only override if we don't already have values from page insights
        if (!insights.engagement || insights.engagement.value === 0) {
          insights.engagement = { value: totalEngagement, previous: 0 };
        }
        if (!insights.impressions || insights.impressions.value === 0) {
          insights.impressions = { value: totalImpressions, previous: 0 };
        }
        if (!insights.reach || insights.reach.value === 0) {
          insights.reach = { value: totalReach, previous: 0 };
        }
        if (!insights.page_views || insights.page_views.value === 0) {
          insights.page_views = { value: totalPageViews, previous: 0 };
        }
      }
      
      // Try to fetch page-level insights (might return empty but worth trying)
      const metricsToTry = [
        'page_impressions',
        'page_impressions_unique', 
        'page_engaged_users',
        'page_views_total'
      ];
      
      for (const metric of metricsToTry) {
        try {
          const insightsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/insights?metric=${metric}&period=${period}&access_token=${account.access_token}`;
          const response = await fetch(insightsUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.data && data.data[0] && data.data[0].values?.length > 0) {
              const metricData = data.data[0];
              const latestValue = metricData.values[metricData.values.length - 1]?.value || 0;
              const previousValue = metricData.values[metricData.values.length - 2]?.value || 0;
              
              // Only update if we got real data
              if (latestValue > 0) {
                switch(metric) {
                  case 'page_impressions':
                    insights.impressions = { value: latestValue, previous: previousValue };
                    break;
                  case 'page_impressions_unique':
                    insights.reach = { value: latestValue, previous: previousValue };
                    break;
                  case 'page_engaged_users':
                    insights.engagement = { value: latestValue, previous: previousValue };
                    break;
                  case 'page_views_total':
                    insights.page_views = { value: latestValue, previous: previousValue };
                    break;
                }
                console.log(`✓ Metric ${metric} succeeded with value:`, latestValue);
              }
            }
          }
        } catch (error) {
          console.log(`Error fetching ${metric}:`, error);
        }
      }
      
      // Set default values for missing metrics
      if (!insights.impressions) insights.impressions = { value: 0, previous: 0 };
      if (!insights.reach) insights.reach = { value: 0, previous: 0 };
      if (!insights.engagement) insights.engagement = { value: 0, previous: 0 };
      if (!insights.page_views) insights.page_views = { value: 0, previous: 0 };
      if (!insights.followers) insights.followers = { value: 0, previous: 0 };

      console.log('Final insights object:', JSON.stringify(insights, null, 2));

      return NextResponse.json({ 
        success: true, 
        insights,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          name: account.display_name
        }
      });
    }

    if (type === 'posts') {
      // Fetch metrics for specific posts
      const { data: posts, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .contains('platforms', ['facebook'])
        .order('posted_at', { ascending: false })
        .limit(50);

      if (postsError) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
      }

      const enrichedPosts = [];
      
      for (const post of posts || []) {
        if (post.post_results && Array.isArray(post.post_results)) {
          const facebookResult = post.post_results.find((r: any) => 
            r.platform === 'facebook' && r.success && r.data?.postId
          );
          
          if (facebookResult) {
            try {
              // Fetch fresh metrics for this post
              const postId = facebookResult.data.postId;
              
              // Get engagement metrics
              const engagementUrl = `https://graph.facebook.com/v21.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${account.access_token}`;
              const engagementResponse = await fetch(engagementUrl);
              
              if (engagementResponse.ok) {
                const engagementData = await engagementResponse.json();
                
                // Try to get insights
                const insightsUrl = `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${account.access_token}`;
                const insightsResponse = await fetch(insightsUrl);
                
                let impressions = 0;
                let reach = 0;
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'post_impressions' && metric.values?.[0]) {
                        impressions = metric.values[0].value || 0;
                      }
                      if (metric.name === 'post_engaged_users' && metric.values?.[0]) {
                        reach = metric.values[0].value || 0;
                      }
                    });
                  }
                }
                
                enrichedPosts.push({
                  ...post,
                  facebook_metrics: {
                    likes: engagementData.likes?.summary?.total_count || 0,
                    comments: engagementData.comments?.summary?.total_count || 0,
                    shares: engagementData.shares?.count || 0,
                    reactions: engagementData.reactions?.summary?.total_count || 0,
                    impressions,
                    reach: reach || impressions,
                    views: impressions
                  }
                });
              }
            } catch (error) {
              console.error('Error fetching metrics for post:', post.id, error);
              enrichedPosts.push(post); // Include post even if metrics fail
            }
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        posts: enrichedPosts,
        account: {
          id: account.id,
          username: account.username || account.platform_user_id,
          name: account.display_name
        }
      });
    }

    return NextResponse.json({ 
      error: 'Invalid type parameter' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching Facebook insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook insights' },
      { status: 500 }
    );
  }
}