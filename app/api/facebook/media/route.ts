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
    
    // Use specified account or first available
    const account = accounts[0];

    // Fetch both posts and videos (including reels) from Facebook
    console.log('Fetching Facebook media from API');
    
    // Prepare URLs for parallel fetching
    const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url,full_picture,attachments{media_type,media,url}&limit=${limit}&access_token=${account.access_token}`;
    const videosUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/videos?fields=id,title,description,created_time,permalink_url,source,thumbnails,length,from&limit=${limit}&access_token=${account.access_token}`;
    
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
    
    // Process posts
    const posts = postsData.data?.map((post: any) => ({
      id: post.id,
      message: post.message || '',
      created_time: post.created_time,
      permalink_url: post.permalink_url,
      full_picture: post.full_picture,
      media_type: post.attachments?.data?.[0]?.media_type || 'status',
      media_url: post.attachments?.data?.[0]?.media?.image?.src || post.full_picture,
      source_type: 'post'
    })) || [];
    
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
          is_reel: video.description?.includes('#reels') || video.title?.includes('#reels') || false
        })) || [];
        console.log(`Fetched ${videos.length} videos including reels`);
      } catch (err) {
        console.error('Error processing videos:', err);
      }
    }
    
    // Merge and deduplicate
    const allMedia = [...posts, ...videos];
    const uniqueMedia = new Map();
    
    // Deduplicate by ID, keeping the version with more data
    allMedia.forEach(item => {
      const existing = uniqueMedia.get(item.id);
      if (!existing || (item.source_type === 'video' && existing.source_type === 'post')) {
        // Prefer video data as it has more details
        uniqueMedia.set(item.id, item);
      }
    });
    
    // Convert back to array and sort by created_time
    const media = Array.from(uniqueMedia.values())
      .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime())
      .slice(0, parseInt(limit));

    // Try to fetch insights for each post
    const mediaWithMetrics = await Promise.all(
      media.map(async (post: any) => {
        try {
          // Fetch insights for the post
          const insightsUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total&access_token=${account.access_token}`;
          const insightsResponse = await fetch(insightsUrl);
          
          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            const metrics: any = {
              impressions: 0,
              engagement: 0,
              clicks: 0,
              reactions: 0,
              likes: 0,
              comments: 0,
              shares: 0
            };
            
            // Process insights data
            if (insightsData.data && Array.isArray(insightsData.data)) {
              insightsData.data.forEach((metric: any) => {
                switch(metric.name) {
                  case 'post_impressions':
                    metrics.impressions = metric.values?.[0]?.value || 0;
                    break;
                  case 'post_engaged_users':
                    metrics.engagement = metric.values?.[0]?.value || 0;
                    break;
                  case 'post_clicks':
                    metrics.clicks = metric.values?.[0]?.value || 0;
                    break;
                  case 'post_reactions_by_type_total':
                    const reactions = metric.values?.[0]?.value || {};
                    metrics.reactions = Object.values(reactions).reduce((sum: number, val: any) => sum + (val || 0), 0);
                    metrics.likes = reactions.like || 0;
                    break;
                }
              });
            }
            
            // Also fetch comments and shares count
            const engagementUrl = `https://graph.facebook.com/v21.0/${post.id}?fields=comments.summary(true),shares&access_token=${account.access_token}`;
            const engagementResponse = await fetch(engagementUrl);
            
            if (engagementResponse.ok) {
              const engagementData = await engagementResponse.json();
              metrics.comments = engagementData.comments?.summary?.total_count || 0;
              metrics.shares = engagementData.shares?.count || 0;
            }
            
            return {
              ...post,
              metrics
            };
          } else {
            // If insights fail, return post without metrics
            console.log('Could not fetch insights for post (permission may be missing)');
            return {
              ...post,
              metrics: {
                impressions: 0,
                engagement: 0,
                clicks: 0,
                reactions: 0,
                likes: 0,
                comments: 0,
                shares: 0
              }
            };
          }
        } catch (error) {
          console.error('Error fetching post insights:', error);
          return {
            ...post,
            metrics: {
              impressions: 0,
              engagement: 0,
              clicks: 0,
              reactions: 0,
              likes: 0,
              comments: 0,
              shares: 0
            }
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      media: mediaWithMetrics,
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