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

    // Get Threads account
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);
    
    // If specific account requested, get that one
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Threads account not connected' },
        { status: 404 }
      );
    }
    
    // Use specified account or first available
    const account = accounts[0];

    // Fetch recent Threads posts from the API
    // Threads API endpoint to get user's posts
    const threadsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,username,permalink,timestamp,media_type,media_url,shortcode,thumbnail_url&limit=${limit}&access_token=${account.access_token}`;
    
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
    
    // Process the posts to match expected format
    const media = data.data?.map((post: any) => ({
      id: post.id,
      text: post.text || '',
      username: post.username,
      permalink: post.permalink,
      timestamp: post.timestamp,
      media_type: post.media_type || 'TEXT',
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      shortcode: post.shortcode
    })) || [];

    // Try to fetch metrics for each post (if threads_manage_insights permission is available)
    const mediaWithMetrics = await Promise.all(
      media.map(async (post: any) => {
        try {
          // Try to get insights (may fail without permission)
          const insightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${account.access_token}`;
          const insightsResponse = await fetch(insightsUrl);
          
          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            const metrics: any = {};
            
            // Process insights data
            if (insightsData.data && Array.isArray(insightsData.data)) {
              insightsData.data.forEach((metric: any) => {
                const value = metric.values?.[0]?.value || 0;
                metrics[metric.name] = value;
              });
            }
            
            return {
              ...post,
              metrics: {
                views: metrics.views || 0,
                likes: metrics.likes || 0,
                replies: metrics.replies || 0,
                reposts: metrics.reposts || 0,
                quotes: metrics.quotes || 0,
                shares: metrics.shares || 0
              }
            };
          } else {
            // If insights fail (no permission), return post without metrics
            console.log('Could not fetch insights for post (permission may be missing)');
            return {
              ...post,
              metrics: {
                views: 0,
                likes: 0,
                replies: 0,
                reposts: 0,
                quotes: 0,
                shares: 0
              }
            };
          }
        } catch (error) {
          console.error('Error fetching post insights:', error);
          return {
            ...post,
            metrics: {
              views: 0,
              likes: 0,
              replies: 0,
              reposts: 0,
              quotes: 0,
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