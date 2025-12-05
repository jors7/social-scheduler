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
    
    // Enhanced logging for debugging
    console.log(`[Facebook Insights] Fetching for account:`, {
      accountId: account.id,
      pageId: account.platform_user_id,
      username: account.username,
      displayName: account.display_name
    });

    if (type === 'page') {
      // Initialize insights object
      const insights: any = {};
      
      // Fetch basic page info first
      const pageInfoUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}?fields=fan_count,name,followers_count,talking_about_count&access_token=${account.access_token}`;
      const pageInfoResponse = await fetch(pageInfoUrl);
      
      if (pageInfoResponse.ok) {
        const pageInfo = await pageInfoResponse.json();
        console.log(`[${account.display_name || account.username}] Page info:`, pageInfo);
        
        insights.fan_count = { value: pageInfo.fan_count || pageInfo.followers_count || 0, previous: 0 };
        insights.page_name = pageInfo.name;
        insights.followers = { value: pageInfo.fan_count || pageInfo.followers_count || 0, previous: 0 };
        
        // talking_about_count can serve as a proxy for engagement
        if (pageInfo.talking_about_count) {
          insights.engagement = { value: pageInfo.talking_about_count, previous: 0 };
        }
      } else {
        const errorData = await pageInfoResponse.text();
        console.error(`[${account.display_name || account.username}] Failed to fetch page info:`, errorData);
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error) {
            console.error(`[${account.display_name || account.username}] Facebook API Error:`, {
              code: errorJson.error.code,
              message: errorJson.error.message,
              type: errorJson.error.type
            });
          }
        } catch (e) {
          // Not JSON error response
        }
      }
      
      // Fetch directly from Facebook API to get real metrics
      let totalImpressions = 0;
      let totalReach = 0;
      let totalEngagement = 0;
      let totalPageViews = 0;
      let fetchedPostsCount = 0;

      try {
        // IMPORTANT: Do NOT include full_picture, attachments, or likes.summary for Instagram cross-posted content
        // These fields cause Facebook to EXCLUDE Instagram cross-posts from the response entirely
        const startTime = Date.now();

        // Calculate 30 days ago timestamp for date filtering
        const since30Days = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        // Fetch ALL posts with pagination (not just first 100)
        let allPosts: any[] = [];
        let nextUrl: string | null = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,shares&limit=100&since=${since30Days}&access_token=${account.access_token}`;
        let pageCount = 0;
        const maxPages = 5; // Safety limit

        while (nextUrl && pageCount < maxPages) {
          const response: Response = await fetch(nextUrl);
          if (!response.ok) break;

          const data = await response.json();
          const posts = data.data || [];
          allPosts = allPosts.concat(posts);

          pageCount++;
          nextUrl = data.paging?.next || null;

          console.log(`[${account.display_name || account.username}] Fetched page ${pageCount}: ${posts.length} posts (total: ${allPosts.length})`);

          // Stop if we have enough posts
          if (allPosts.length >= 200) break;
        }

        // Also fetch videos in parallel (they have view counts)
        const videosResponse = await fetch(`https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,views&limit=50&since=${since30Days}&access_token=${account.access_token}`).catch(() => null);

        const posts = allPosts;
        fetchedPostsCount = posts.length;

        console.log(`[${account.display_name || account.username}] Total: ${posts.length} posts fetched in ${Date.now() - startTime}ms across ${pageCount} pages`);

        if (posts.length > 0) {

          // Use Facebook Batch API to fetch metrics for all posts at once
          // Facebook allows max 50 requests per batch call
          // Since we make 2 requests per post (engagement + insights), max 25 posts per batch
          const BATCH_SIZE = 25;
          for (let i = 0; i < posts.length; i += BATCH_SIZE) {
            const batch = posts.slice(i, i + BATCH_SIZE);

            // Build batch requests for both engagement AND insights
            const batchRequests = batch.flatMap((post: any) => [
              // Request 1: Engagement (may fail for Instagram cross-posts)
              {
                method: 'GET',
                relative_url: `${post.id}?fields=likes.summary(true),comments.summary(true),shares`
              },
              // Request 2: Insights for views
              {
                method: 'GET',
                relative_url: `${post.id}/insights?metric=post_media_view`
              }
            ]);

            try {
              const batchStartTime = Date.now();
              const batchResponse = await fetch(
                `https://graph.facebook.com/v21.0/?batch=${encodeURIComponent(JSON.stringify(batchRequests))}&access_token=${account.access_token}`,
                { method: 'POST' }
              );

              if (batchResponse.ok) {
                const batchResults = await batchResponse.json();
                console.log(`[${account.display_name || account.username}] Batch API returned ${batchResults?.length || 0} results in ${Date.now() - batchStartTime}ms`);

                // Process batch results - each post has 2 responses
                for (let j = 0; j < batch.length; j++) {
                  const post = batch[j];
                  const engagementResult = batchResults[j * 2];
                  const insightsResult = batchResults[j * 2 + 1];

                  // Process engagement (may be error for Instagram cross-posts)
                  if (engagementResult?.code === 200 && engagementResult?.body) {
                    try {
                      const engagementData = JSON.parse(engagementResult.body);
                      const postLikes = engagementData.likes?.summary?.total_count || 0;
                      const postComments = engagementData.comments?.summary?.total_count || 0;
                      const postShares = engagementData.shares?.count || post.shares?.count || 0;
                      totalEngagement += postLikes + postComments + postShares;
                    } catch (e) {
                      // Parse error, use shares from initial fetch
                      totalEngagement += post.shares?.count || 0;
                    }
                  } else {
                    // Engagement failed (likely Instagram cross-post), use shares from initial fetch
                    totalEngagement += post.shares?.count || 0;
                  }

                  // Process insights (should work for all posts)
                  if (insightsResult?.code === 200 && insightsResult?.body) {
                    try {
                      const insightsData = JSON.parse(insightsResult.body);
                      if (insightsData.data && Array.isArray(insightsData.data)) {
                        insightsData.data.forEach((metric: any) => {
                          if (metric.name === 'post_media_view' && metric.values?.[0]) {
                            const value = metric.values[0].value || 0;
                            totalImpressions += value;
                            totalReach += value;
                          }
                        });
                      }
                    } catch (e) {
                      // Parse error, continue
                    }
                  }
                }
              } else {
                console.error(`[${account.display_name || account.username}] Batch API failed with status ${batchResponse.status}`);
              }
            } catch (batchError: any) {
              console.error(`[${account.display_name || account.username}] Batch API error:`, batchError.message);
            }
          }
        }

        // Also process videos if available (they often have view counts)
        if (videosResponse && videosResponse.ok) {
          const videosData = await videosResponse.json();
          const videos = videosData.data || [];

          console.log(`[${account.display_name || account.username}] Fetched ${videos.length} videos from Facebook API`);

          for (const video of videos) {
            // Videos have direct view counts
            if (video.views) {
              totalImpressions += video.views;
              totalReach += Math.floor(video.views * 0.7);
            }
          }
        }

        console.log(`[${account.display_name || account.username}] Total processing time: ${Date.now() - startTime}ms`);

        // Use impressions as proxy for page views
        totalPageViews = Math.floor(totalImpressions * 0.3);
      } catch (error: any) {
        console.error(`[${account.display_name || account.username}] Error fetching Facebook posts:`, error.message || error);
        if (error.message?.includes('permission') || error.message?.includes('OAuthException')) {
          console.error(`[${account.display_name || account.username}] Likely missing permissions for insights`);
        }
      }
      
      // Log aggregated values for debugging
      console.log(`[${account.display_name || account.username}] ============ AGGREGATED METRICS SUMMARY ============`);
      console.log(`[${account.display_name || account.username}] Processed ${fetchedPostsCount} posts from Facebook API`);
      console.log(`[${account.display_name || account.username}] Total Engagement: ${totalEngagement}`);
      console.log(`[${account.display_name || account.username}] Total Impressions: ${totalImpressions}`);
      console.log(`[${account.display_name || account.username}] Total Reach: ${totalReach}`);
      console.log(`[${account.display_name || account.username}] Total Page Views: ${totalPageViews}`);
      console.log(`[${account.display_name || account.username}] ==================================================`);
      
      // Enhanced fallback: Properly aggregate post-level metrics
      console.log(`[${account.display_name || account.username}] Applying fallback metrics strategy`);
      console.log(`[${account.display_name || account.username}] Current insights before fallback:`, JSON.stringify(insights));
      console.log(`[${account.display_name || account.username}] Aggregated totals:`, {
        fetchedPostsCount,
        totalEngagement,
        totalImpressions,
        totalReach,
        totalPageViews
      });
      
      // IMPORTANT FIX: Always use calculated values when we have post data
      // This fixes the issue where post-level metrics show but overview doesn't
      
      // For engagement, always use calculated value if we fetched posts
      if (totalEngagement > 0 || fetchedPostsCount > 0) {
        const oldValue = insights.engagement?.value || 0;
        insights.engagement = { value: totalEngagement, previous: 0 };
        console.log(`[${account.display_name || account.username}] Updated engagement: ${oldValue} -> ${totalEngagement}`);
      }
      
      // For impressions, always use calculated when available
      if (totalImpressions > 0) {
        const oldValue = insights.impressions?.value || 0;
        insights.impressions = { value: totalImpressions, previous: 0 };
        console.log(`[${account.display_name || account.username}] Updated impressions: ${oldValue} -> ${totalImpressions}`);
      } else if (!insights.impressions?.value && fetchedPostsCount > 0) {
        // No impressions but we have posts - keep as 0 but log it
        insights.impressions = { value: 0, previous: 0 };
        console.log(`[${account.display_name || account.username}] No impressions data available for ${fetchedPostsCount} posts`);
      }
      
      // Fetch page-level reach metric as fallback (Meta's new page_media_view API)
      let pageMediaViews = 0;
      try {
        const since = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // Last 30 days
        const pageMediaViewUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/insights?metric=page_media_view&period=day&since=${since}&access_token=${account.access_token}`;
        const pageResponse = await fetch(pageMediaViewUrl);

        if (pageResponse.ok) {
          const pageData = await pageResponse.json();
          if (pageData.data?.[0]?.values) {
            pageMediaViews = pageData.data[0].values.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
            console.log(`[${account.display_name || account.username}] Page-level reach (page_media_view): ${pageMediaViews}`);
          }
        }
      } catch (error) {
        console.error(`[${account.display_name || account.username}] Error fetching page_media_view:`, error);
      }

      // For reach, use post-level as primary, page-level as fallback (matching analytics endpoint logic)
      const calculatedReach = totalReach > 0 ? totalReach : pageMediaViews;

      if (calculatedReach > 0) {
        const oldValue = insights.reach?.value || 0;
        insights.reach = { value: calculatedReach, previous: 0 };
        console.log(`[${account.display_name || account.username}] Updated reach: ${oldValue} -> ${calculatedReach} (post-level: ${totalReach}, page-level: ${pageMediaViews})`);
      } else if (totalImpressions > 0) {
        // Estimate reach from impressions if not available
        totalReach = Math.floor(totalImpressions * 0.8);
        insights.reach = { value: totalReach, previous: 0 };
        console.log(`[${account.display_name || account.username}] Estimated reach from impressions: ${totalReach}`);
      } else if (!insights.reach?.value && fetchedPostsCount > 0) {
        insights.reach = { value: 0, previous: 0 };
        console.log(`[${account.display_name || account.username}] No reach data available for ${fetchedPostsCount} posts`);
      }
      
      // For page views, use calculated or estimate from impressions
      if (!insights.page_views?.value || insights.page_views.value === 0) {
        insights.page_views = { value: totalPageViews, previous: 0 };
        console.log(`[${account.display_name || account.username}] Set page views: ${totalPageViews}`);
      }

      // REMOVED: Deprecated metrics section (page_impressions, page_impressions_unique)
      // Meta deprecated these APIs in November 2025. We now use page_media_view exclusively.
      // The old code was overwriting our correct reach values with stale/incorrect data.

      // Final safety check - only set zero if value is completely missing
      // But DON'T overwrite non-zero calculated values
      if (insights.impressions === undefined) {
        insights.impressions = { value: 0, previous: 0 };
      }
      if (insights.reach === undefined) {
        insights.reach = { value: 0, previous: 0 };
      }
      if (insights.engagement === undefined) {
        insights.engagement = { value: 0, previous: 0 };
      }
      if (insights.page_views === undefined) {
        insights.page_views = { value: 0, previous: 0 };
      }
      if (insights.followers === undefined) {
        insights.followers = { value: 0, previous: 0 };
      }

      console.log(`[${account.display_name || account.username}] Final insights object:`, JSON.stringify(insights, null, 2));

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
                
                // Try to get insights (using post_media_view - Meta's replacement for deprecated post_impressions)
                const insightsUrl = `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_media_view,post_engaged_users&access_token=${account.access_token}`;
                const insightsResponse = await fetch(insightsUrl);

                let impressions = 0;
                let reach = 0;

                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'post_media_view' && metric.values?.[0]) {
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