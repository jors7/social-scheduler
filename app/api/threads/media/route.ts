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
    const limit = searchParams.get('limit') || '10';
    const accountId = searchParams.get('accountId');

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

    // Fetch recent Threads posts from the API
    // Note: Metrics fields (views, likes, etc.) are NOT available on the /me/threads endpoint
    // They must be fetched separately via the insights endpoint for each post
    const threadsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,username,permalink,timestamp,media_type,media_url,shortcode,thumbnail_url,children&limit=${limit}&access_token=${accessToken}`;
    
    console.log('Fetching Threads media from API');
    
    const response = await fetch(threadsUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch Threads media:', errorData);
      
      // Check if it's a token expiration error
      if (errorData.error?.code === 190 || errorData.error?.message?.includes('expired')) {
        return NextResponse.json(
          { 
            error: 'Threads token expired',
            requiresReconnect: true 
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: errorData.error?.message || 'Failed to fetch Threads posts',
          details: errorData.error 
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    
    console.log('Raw Threads API response:', JSON.stringify(data, null, 2));
    
    // Process the posts to match expected format
    const media = data.data?.map((post: any) => {
      // For carousel posts, try to get the first child's media
      let mediaUrl = post.media_url;
      let thumbnailUrl = post.thumbnail_url;
      
      if (!mediaUrl && post.children?.data?.length > 0) {
        mediaUrl = post.children.data[0].media_url;
        thumbnailUrl = post.children.data[0].thumbnail_url;
      }
      
      const processedPost = {
        id: post.id,
        text: post.text || '',
        username: post.username,
        permalink: post.permalink,
        timestamp: post.timestamp,
        media_type: post.media_type || 'TEXT',
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        shortcode: post.shortcode,
        // Metrics will be fetched separately via insights API
        metrics: {
          views: 0,
          likes: 0,
          replies: 0,
          reposts: 0,
          quotes: 0,
          shares: 0
        }
      };
      
      return processedPost;
    }) || [];

    // For ALL posts, fetch individual post data to ensure we have media URLs
    // The batch API often doesn't return media_url even when media exists
    const mediaWithUrls = await Promise.all(
      media.map(async (post: any) => {
        // Always try to fetch individual post for media types to ensure we get URLs
        if (post.media_type && post.media_type !== 'TEXT' && post.media_type !== 'STATUS') {
          try {
            const postUrl = `https://graph.threads.net/v1.0/${post.id}?fields=id,text,username,permalink,timestamp,media_type,media_url,thumbnail_url,shortcode,children&access_token=${accessToken}`;
            const postResponse = await fetch(postUrl);
            
            if (postResponse.ok) {
              const postData = await postResponse.json();
              
              // Get media URL from the individual post response
              let finalMediaUrl = postData.media_url;
              let finalThumbnailUrl = postData.thumbnail_url;
              
              // If still no media URL and has children, get from first child
              if (!finalMediaUrl && postData.children?.data?.length > 0) {
                finalMediaUrl = postData.children.data[0].media_url;
                finalThumbnailUrl = postData.children.data[0].thumbnail_url;
              }
              
              // Update with media URLs from individual fetch
              return {
                ...post,
                media_url: finalMediaUrl || post.media_url,
                thumbnail_url: finalThumbnailUrl || post.thumbnail_url
              };
            }
          } catch (error) {
            console.error(`Error fetching individual post ${post.id}:`, error);
          }
        }
        
        return post;
      })
    );
    
    // Now fetch metrics for each post using the Insights API
    // The Threads API requires using a separate insights endpoint for metrics
    const mediaWithMetrics = await Promise.all(
      mediaWithUrls.map(async (post: any) => {
        try {
          // Threads Insights API endpoint for individual post metrics
          const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
          
          console.log(`Fetching insights for post ${post.id}`);
          const insightsResponse = await fetch(insightsUrl);
          
          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            console.log(`Insights response for ${post.id}:`, JSON.stringify(insightsData, null, 2));
            
            // Parse the insights response
            const metrics: any = {
              views: 0,
              likes: 0,
              replies: 0,
              reposts: 0,
              quotes: 0,
              shares: 0
            };
            
            if (insightsData.data && Array.isArray(insightsData.data)) {
              insightsData.data.forEach((metric: any) => {
                if (metric.name && metric.values && metric.values[0]) {
                  metrics[metric.name] = metric.values[0].value || 0;
                }
              });
            }
            
            return {
              ...post,
              metrics
            };
          } else {
            const errorText = await insightsResponse.text();
            console.log(`Failed to get insights for post ${post.id}:`, errorText);
            // Return post with zero metrics if insights fail
            return post;
          }
        } catch (error) {
          console.error(`Error fetching insights for post ${post.id}:`, error);
          return post;
        }
      })
    );

    return NextResponse.json({
      success: true,
      media: mediaWithMetrics,
      account: {
        id: account.id,
        username: account.username || account.platform_user_id
      }
    });
    
  } catch (error) {
    console.error('Error in Threads media endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Threads media' },
      { status: 500 }
    );
  }
}