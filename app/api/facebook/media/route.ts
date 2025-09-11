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

    // Fetch recent Facebook posts from the API
    // Facebook uses page posts endpoint
    const facebookUrl = `https://graph.facebook.com/v18.0/${account.platform_user_id}/posts?fields=id,message,created_time,permalink_url,full_picture,attachments{media_type,media,url}&limit=${limit}&access_token=${account.access_token}`;
    
    console.log('Fetching Facebook media from API');
    
    const response = await fetch(facebookUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch Facebook media:', errorData);
      
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

    const data = await response.json();
    
    // Process the posts to match expected format
    const media = data.data?.map((post: any) => ({
      id: post.id,
      message: post.message || '',
      created_time: post.created_time,
      permalink_url: post.permalink_url,
      full_picture: post.full_picture,
      media_type: post.attachments?.data?.[0]?.media_type || 'status',
      media_url: post.attachments?.data?.[0]?.media?.image?.src || post.full_picture
    })) || [];

    // Try to fetch insights for each post
    const mediaWithMetrics = await Promise.all(
      media.map(async (post: any) => {
        try {
          // Fetch insights for the post
          const insightsUrl = `https://graph.facebook.com/v18.0/${post.id}/insights?metric=post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total&access_token=${account.access_token}`;
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
            const engagementUrl = `https://graph.facebook.com/v18.0/${post.id}?fields=comments.summary(true),shares&access_token=${account.access_token}`;
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