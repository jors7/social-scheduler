import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Fetch metrics for multiple posts using Facebook Batch API
 * This dramatically reduces API calls: instead of 2 calls per post, we batch into groups of 50
 * Facebook Batch API allows up to 50 requests per batch call
 */
async function fetchMetricsInBatches(posts: any[], account: any): Promise<any[]> {
  // Facebook allows max 50 requests per batch call
  // Since we make 2 requests per post (engagement + insights), max 25 posts per batch
  const BATCH_SIZE = 25;
  const results: any[] = [];

  // Process posts in batches
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);

    // Build batch requests for engagement + thumbnail AND insights
    const batchRequests = batch.flatMap(post => [
      // Request 1: Engagement + thumbnail (may fail for Instagram cross-posts)
      {
        method: 'GET',
        relative_url: `${post.id}?fields=full_picture,shares,likes.summary(true),comments.summary(true),reactions.summary(true)`
      },
      // Request 2: Insights for views/reach (works for all posts)
      {
        method: 'GET',
        relative_url: `${post.id}/insights?metric=post_media_view`
      }
    ]);

    try {
      // Make single batch API call
      const batchResponse = await fetch(
        `https://graph.facebook.com/v21.0/?batch=${encodeURIComponent(JSON.stringify(batchRequests))}&access_token=${account.access_token}`,
        { method: 'POST' }
      );

      if (!batchResponse.ok) {
        console.error('Batch API failed, falling back to individual calls');
        // Fall back to returning posts with initial metrics
        return posts.map(post => ({
          ...post,
          metrics: {
            impressions: post.initial_metrics?.views || 0,
            engagement: 0,
            likes: 0,
            comments: 0,
            shares: post.initial_metrics?.shares || 0,
            reactions: 0,
            views: post.initial_metrics?.views || 0,
            reach: 0
          }
        }));
      }

      const batchResults = await batchResponse.json();

      // Process batch results - each post has 2 responses (engagement + insights)
      for (let j = 0; j < batch.length; j++) {
        const post = batch[j];
        const engagementResult = batchResults[j * 2];
        const insightsResult = batchResults[j * 2 + 1];

        const metrics: any = {
          impressions: post.initial_metrics?.views || 0,
          engagement: 0,
          likes: 0,
          comments: 0,
          shares: post.initial_metrics?.shares || 0,
          reactions: 0,
          views: post.initial_metrics?.views || 0,
          reach: 0
        };

        let thumbnailUrl = post.media_url;

        // Process engagement response (may be error for Instagram cross-posts)
        if (engagementResult?.code === 200 && engagementResult?.body) {
          try {
            const engagementData = JSON.parse(engagementResult.body);
            metrics.likes = engagementData.likes?.summary?.total_count || 0;
            metrics.comments = engagementData.comments?.summary?.total_count || 0;
            metrics.shares = engagementData.shares?.count || metrics.shares;
            metrics.reactions = engagementData.reactions?.summary?.total_count || 0;
            thumbnailUrl = engagementData.full_picture || thumbnailUrl;
          } catch (e) {
            // Parse error, continue with defaults
          }
        }

        // Calculate total engagement
        metrics.engagement = metrics.likes + metrics.comments + metrics.shares;

        // Process insights response (should work for all posts)
        if (insightsResult?.code === 200 && insightsResult?.body) {
          try {
            const insightsData = JSON.parse(insightsResult.body);
            if (insightsData.data && Array.isArray(insightsData.data)) {
              insightsData.data.forEach((metric: any) => {
                if (metric.name === 'post_media_view' && metric.values?.[0]) {
                  const value = metric.values[0].value || 0;
                  metrics.impressions = value || metrics.impressions;
                  metrics.views = value || metrics.views;
                  metrics.reach = value || metrics.reach;
                }
              });
            }
          } catch (e) {
            // Parse error, continue with defaults
          }
        }

        results.push({
          ...post,
          media_url: thumbnailUrl,
          full_picture: thumbnailUrl,
          metrics
        });
      }
    } catch (error) {
      console.error('Error in batch API call:', error);
      // On error, return posts with initial metrics
      batch.forEach(post => {
        results.push({
          ...post,
          metrics: {
            impressions: post.initial_metrics?.views || 0,
            engagement: 0,
            likes: 0,
            comments: 0,
            shares: post.initial_metrics?.shares || 0,
            reactions: 0,
            views: post.initial_metrics?.views || 0,
            reach: 0
          }
        });
      });
    }
  }

  return results;
}

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
    const fetchAll = searchParams.get('fetchAll') === 'true'; // For top performers, fetch all posts

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

    // Calculate 30 days ago timestamp for date filtering
    const since = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    // IMPORTANT: Do NOT include full_picture, attachments, or likes.summary for Instagram cross-posted content
    // These fields cause Facebook to EXCLUDE Instagram cross-posts from the response entirely
    // We'll fetch engagement data separately for each post using the insights API
    const initialPostsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url,shares&limit=${limit}&since=${since}&access_token=${account.access_token}`;
    const videosUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,permalink_url,source,thumbnails,length,from,views&limit=${limit}&since=${since}&access_token=${account.access_token}`;

    // Fetch posts - only paginate if fetchAll=true (for top performers)
    let allPosts: any[] = [];
    let nextPostsUrl: string | null = initialPostsUrl;
    let postsPageCount = 0;
    const maxPages = fetchAll ? 5 : 1; // Only paginate if fetching all posts
    const targetPostCount = fetchAll ? 30 : parseInt(limit); // How many posts we need
    let postsError = null;

    while (nextPostsUrl && postsPageCount < maxPages) {
      try {
        const response: Response = await fetch(nextPostsUrl);

        if (!response.ok) {
          const errorData: any = await response.json();
          console.error(`Failed to fetch Facebook posts page ${postsPageCount + 1}:`, errorData);

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

          postsError = errorData;
          break;
        }

        const data = await response.json();
        const posts = data.data || [];
        allPosts = allPosts.concat(posts);

        console.log(`Fetched page ${postsPageCount + 1}: ${posts.length} posts (total: ${allPosts.length}, target: ${targetPostCount})`);

        // Check if there's a next page
        nextPostsUrl = data.paging?.next || null;
        postsPageCount++;

        // Stop if we've fetched enough posts
        if (allPosts.length >= targetPostCount) {
          console.log(`Fetched ${allPosts.length} posts (target: ${targetPostCount}), stopping pagination`);
          break;
        }
      } catch (error) {
        console.error(`Error fetching posts page ${postsPageCount + 1}:`, error);
        break;
      }
    }

    console.log(`Total posts fetched: ${allPosts.length} across ${postsPageCount} pages`);

    // If there was an error and we have no posts, return error
    if (postsError && allPosts.length === 0) {
      return NextResponse.json(
        {
          error: postsError.error?.message || 'Failed to fetch Facebook posts',
          details: postsError.error
        },
        { status: 400 }
      );
    }

    // Fetch videos (single call)
    let videosResponse = null;
    try {
      videosResponse = await fetch(videosUrl);
    } catch (err) {
      console.log('Videos endpoint failed (might not have permission):', err);
    }

    // Format posts data for existing code
    const postsData = { data: allPosts };

    // Process posts - we don't have full_picture/attachments/likes from batch fetch
    // (those fields cause Instagram cross-posts to be excluded from the response)
    // We'll get the image and engagement data separately for each post
    const posts = postsData.data?.map((post: any) => {
      return {
        id: post.id,
        message: post.message || '',
        created_time: post.created_time,
        permalink_url: post.permalink_url,
        full_picture: null, // Will be fetched separately if needed
        media_type: 'post', // Will be determined later
        media_url: null, // Will be fetched separately if needed
        source_type: 'post',
        initial_metrics: {
          likes: 0, // Will be fetched via insights API
          comments: 0,
          shares: post.shares?.count || 0,
          reactions: 0
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
            likes: 0, // Will be fetched via insights API
            comments: 0,
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

    // Fetch metrics using Facebook Batch API for much faster performance
    // Instead of 2 API calls per post (60+ calls), we batch into 2-3 calls total
    const mediaWithMetrics = await fetchMetricsInBatches(media, account);

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