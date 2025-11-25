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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '10';
    const accountId = searchParams.get('accountId');

    // Get Facebook account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);
    
    // If specific account requested, get that one
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
    
    // Use the found account (will be the specific one if accountId was provided, or first available)
    const account = accounts[0];

    // Fetch both posts and videos (including reels) from Facebook
    console.log('Fetching Facebook media from API for:', {
      accountId: account.id,
      username: account.username,
      platform_user_id: account.platform_user_id,
      requestedAccountId: accountId
    });
    
    // Prepare URLs for parallel fetching - use simpler attachment fields
    const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url,full_picture,attachments,likes.summary(true),comments.summary(true),shares,reactions.summary(true)&limit=${limit}&access_token=${account.access_token}`;
    const videosUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,permalink_url,source,thumbnails,length,from,views,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${account.access_token}`;
    
    // Fetch both endpoints in parallel
    const [postsResponse, videosResponse] = await Promise.all([
      fetch(postsUrl),
      fetch(videosUrl).catch(err => {
        console.log('Videos endpoint failed (might not have permission):', err);
        return null;
      })
    ]);
    
    // Handle posts response
    if (!postsResponse.ok) {
      const errorData = await postsResponse.json();
      console.error('Failed to fetch Facebook posts:', errorData);
      
      // Check if it's a token expiration error
      if (errorData.error?.code === 190 || errorData.error?.message?.includes('expired')) {
        return NextResponse.json(
          { 
            error: 'Facebook token expired',
            requiresReconnect: true 
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: errorData.error?.message || 'Failed to fetch Facebook posts',
          details: errorData.error 
        },
        { status: 400 }
      );
    }

    const postsData = await postsResponse.json();
    
    // Process posts with engagement data
    const posts = postsData.data?.map((post: any) => {
      // Extract media type from attachments safely
      let mediaType = 'status';
      let mediaUrl = post.full_picture;
      
      if (post.attachments?.data && post.attachments.data.length > 0) {
        const attachment = post.attachments.data[0];
        mediaType = attachment.media_type || attachment.type || 'status';
        if (attachment.media?.image?.src) {
          mediaUrl = attachment.media.image.src;
        }
      }
      
      return {
        id: post.id,
        message: post.message || '',
        created_time: post.created_time,
        permalink_url: post.permalink_url,
        full_picture: post.full_picture,
        media_type: mediaType,
        media_url: mediaUrl,
        source_type: 'post',
        initial_metrics: {
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          reactions: post.reactions?.summary?.total_count || 0
        }
      };
    }) || [];
    
    // Process videos if available
    let videos: any[] = [];
    if (videosResponse && videosResponse.ok) {
      try {
        const videosData = await videosResponse.json();
        videos = videosData.data?.map((video: any) => ({
          id: video.id,
          message: video.title || video.description || '',
          created_time: video.created_time,
          permalink_url: video.permalink_url,
          full_picture: video.thumbnails?.data?.[0]?.uri || null,
          media_type: 'video',
          media_url: video.thumbnails?.data?.[0]?.uri || null,
          video_source: video.source,
          source_type: 'video',
          is_reel: video.description?.includes('#reels') || video.title?.includes('#reels') || false,
          initial_metrics: {
            views: video.views || 0,
            likes: video.likes?.summary?.total_count || 0,
            comments: video.comments?.summary?.total_count || 0,
            shares: 0,
            reactions: 0
          }
        })) || [];
        console.log(`Fetched ${videos.length} videos including reels with view counts`);
        // Log sample video data for debugging
        if (videos.length > 0) {
          console.log('Sample video:', {
            id: videos[0].id,
            message: videos[0].message?.substring(0, 50),
            views: videos[0].initial_metrics?.views
          });
        }
      } catch (err) {
        console.error('Error processing videos:', err);
      }
    }
    
    // Merge and deduplicate
    const allMedia = [...posts, ...videos];
    const uniqueMedia = new Map();
    
    // Deduplicate by ID, intelligently merging data
    console.log(`Total media before dedup: ${allMedia.length} (${posts.length} posts, ${videos.length} videos)`);
    
    // Create a map of video view counts for untitled videos (likely Instagram reels)
    const videoViewsMap = new Map();
    videos.forEach(video => {
      if (video.message?.toLowerCase() === 'untitled' || !video.message) {
        // Store the views for matching with posts later
        videoViewsMap.set(video.created_time, video.initial_metrics?.views || 0);
        console.log(`Found untitled video with ${video.initial_metrics?.views} views at ${video.created_time}`);
      }
    });
    
    // Add all posts, enriching with video view data if available
    posts.forEach((post: any) => {
      // Try to find matching video views by timestamp (within 60 seconds)
      const postTime = new Date(post.created_time).getTime();
      let matchedViews = 0;
      
      for (const [videoTime, views] of Array.from(videoViewsMap.entries())) {
        const videoTimeMs = new Date(videoTime).getTime();
        const timeDiff = Math.abs(postTime - videoTimeMs);
        
        // If within 60 seconds, consider it a match
        if (timeDiff < 60000) {
          matchedViews = views;
          console.log(`Matched post ${post.id} with video views: ${views}`);
          break;
        }
      }
      
      // Enhance post metrics with video views if found
      if (matchedViews > 0) {
        post.initial_metrics.views = matchedViews;
      }
      
      uniqueMedia.set(post.id, post);
    });
    
    // Only add videos that have real titles (not Instagram reels duplicates)
    videos.forEach(video => {
      const hasRealTitle = video.message && 
                          video.message !== '' && 
                          video.message.toLowerCase() !== 'untitled';
      
      if (hasRealTitle) {
        console.log(`Adding standalone video ${video.id}: "${video.message}"`);
        uniqueMedia.set(video.id, video);
      }
    });
    
    // Convert back to array and sort by created_time
    const media = Array.from(uniqueMedia.values())
      .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime())
      .slice(0, parseInt(limit));

    // Try to fetch additional metrics for each post
    const mediaWithMetrics = await Promise.all(
      media.map(async (post: any) => {
        // Start with initial metrics if available
        const metrics: any = {
          impressions: post.initial_metrics?.views || 0,
          engagement: 0,
          clicks: 0,
          reactions: post.initial_metrics?.reactions || 0,
          likes: post.initial_metrics?.likes || 0,
          comments: post.initial_metrics?.comments || 0,
          shares: post.initial_metrics?.shares || 0,
          views: post.initial_metrics?.views || 0,
          reach: 0
        };
        
        try {
          // Try to get insights if available (requires read_insights permission)
          // First try to get updated engagement data
          const fields = 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)';
          const engagementUrl = `https://graph.facebook.com/v21.0/${post.id}?fields=${fields}&access_token=${account.access_token}`;
          const engagementResponse = await fetch(engagementUrl);
          
          if (engagementResponse.ok) {
            const engagementData = await engagementResponse.json();
            
            // Update metrics with fresh engagement data
            metrics.likes = engagementData.likes?.summary?.total_count || metrics.likes;
            metrics.comments = engagementData.comments?.summary?.total_count || metrics.comments;
            metrics.shares = engagementData.shares?.count || metrics.shares;
            metrics.reactions = engagementData.reactions?.summary?.total_count || metrics.reactions;
            
            // Calculate total engagement
            metrics.engagement = metrics.likes + metrics.comments + metrics.shares;
            
            // Use initial views if we have them
            if (post.initial_metrics?.views && post.initial_metrics.views > 0) {
              metrics.views = post.initial_metrics.views;
              metrics.impressions = post.initial_metrics.views;
              metrics.reach = Math.floor(post.initial_metrics.views * 0.7);
              console.log(`[${account.display_name || account.username}] Post ${post.id} - Using video views as initial metrics: ${post.initial_metrics.views}`);
            }

            // Try to get post insights for views (Meta's replacement for deprecated post_impressions as of Nov 2025)
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_media_view&access_token=${account.access_token}`;
              const insightsResponse = await fetch(insightsUrl);

              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                console.log(`[${account.display_name || account.username}] Post ${post.id} insights response:`, JSON.stringify(insightsData, null, 2));
                if (insightsData.data && Array.isArray(insightsData.data)) {
                  let hadInsights = false;
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'post_media_view' && metric.values?.[0]) {
                      const value = metric.values[0].value || 0;
                      metrics.impressions = value || metrics.impressions;
                      metrics.views = value || metrics.views;
                      metrics.reach = value || metrics.reach; // post_media_view represents both views and unique reach
                      hadInsights = true;
                      console.log(`[${account.display_name || account.username}] Post ${post.id} - Got views from API: ${value}`);
                    }
                  });
                  if (!hadInsights) {
                    console.log(`[${account.display_name || account.username}] ⚠️ NO DATA: Post ${post.id} - API returned empty insights data`);
                  }
                }
              } else {
                const errorText = await insightsResponse.text();
                console.error(`[${account.display_name || account.username}] ❌ Insights API failed for post ${post.id}. Status: ${insightsResponse.status}, Response:`, errorText);
              }
            } catch (error) {
              // Insights might not be available, continue with existing metrics
              console.error(`[${account.display_name || account.username}] ❌ Exception fetching insights for post ${post.id}:`, error);
            }
          }
          
          console.log(`[${account.display_name || account.username}] Metrics for post ${post.id}:`, {
            impressions: metrics.impressions,
            reach: metrics.reach,
            engagement: metrics.engagement,
            likes: metrics.likes,
            hasViews: metrics.views > 0
          });
          return {
            ...post,
            metrics
          };
        } catch (error) {
          console.error('Error fetching post metrics:', error);
          // Return with initial metrics if available
          return {
            ...post,
            metrics
          };
        }
      })
    );

    // Calculate totals from individual posts for debugging
    const totalMetrics = mediaWithMetrics.reduce((acc, post) => {
      return {
        impressions: acc.impressions + (post.metrics?.impressions || 0),
        reach: acc.reach + (post.metrics?.reach || 0),
        engagement: acc.engagement + (post.metrics?.engagement || 0),
        likes: acc.likes + (post.metrics?.likes || 0),
        comments: acc.comments + (post.metrics?.comments || 0),
        shares: acc.shares + (post.metrics?.shares || 0)
      };
    }, { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0 });
    
    console.log(`[${account.display_name || account.username}] MEDIA ENDPOINT TOTALS:`, totalMetrics);

    return NextResponse.json({
      success: true,
      media: mediaWithMetrics,
      totalMetrics, // Include for debugging
      account: {
        id: account.id,
        username: account.username || account.platform_user_id,
        name: account.display_name
      }
    });
    
  } catch (error) {
    console.error('Error in Facebook media endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook media' },
      { status: 500 }
    );
  }
}