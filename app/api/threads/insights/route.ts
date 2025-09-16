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
      // Get user profile with follower count and other metrics
      const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography,follower_count,following_count&access_token=${accessToken}`;
      
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
      const postsUrl = `https://graph.threads.net/v1.0/me/threads?fields=views,likes,replies,reposts,quotes&limit=25&access_token=${accessToken}`;
      const postsResponse = await fetch(postsUrl);
      
      let totalEngagement = 0;
      let totalViews = 0;
      let postCount = 0;
      
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        if (postsData.data && Array.isArray(postsData.data)) {
          postsData.data.forEach((post: any) => {
            totalViews += post.views || 0;
            totalEngagement += (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0);
            postCount++;
          });
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
          followerCount: profileData.follower_count || 0,
          followingCount: profileData.following_count || 0,
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
      const postsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,permalink,timestamp,media_type,views,likes,replies,reposts,quotes&limit=${limit}&access_token=${accessToken}`;
      
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
      
      // Calculate metrics for each post
      const postsWithMetrics = postsData.data?.map((post: any) => {
        const engagement = (post.likes || 0) + (post.replies || 0) + (post.reposts || 0) + (post.quotes || 0);
        const engagementRate = post.views > 0 ? (engagement / post.views) * 100 : 0;
        
        return {
          ...post,
          metrics: {
            views: post.views || 0,
            likes: post.likes || 0,
            replies: post.replies || 0,
            reposts: post.reposts || 0,
            quotes: post.quotes || 0,
            engagement,
            engagementRate: engagementRate.toFixed(2)
          }
        };
      }) || [];
      
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