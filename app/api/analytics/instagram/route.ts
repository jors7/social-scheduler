import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Cache for Instagram data when token expires
const instagramCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface InstagramMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  posts: Array<{
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    permalink?: string;
    timestamp: string;
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    impressions: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get Instagram accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);

    console.log('[Instagram Analytics] Found accounts:', accounts?.length || 0);

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('[Instagram Analytics] No active Instagram accounts found');
      return NextResponse.json({ 
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalImpressions: 0,
          posts: []
        }
      });
    }

    const allMetrics: InstagramMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalImpressions: 0,
      posts: []
    };

    // Fetch data for each Instagram account
    for (const account of accounts) {
      if (!account.access_token) continue;

      try {
        // Get Instagram media
        const mediaUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=100&access_token=${account.access_token}`;
        console.log('[Instagram Analytics] Fetching media for account:', account.username || account.platform_user_id);
        
        const mediaResponse = await fetch(mediaUrl);
        
        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text();
          console.error(`[Instagram Analytics] Failed to fetch media for account ${account.id}:`, errorText);
          
          // Check if token is expired
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.code === 190) {
              // Token is invalid or expired
              console.log('[Instagram Analytics] Token expired for account:', account.id);
              
              // Mark the account as needing re-authentication
              await supabase
                .from('social_accounts')
                .update({ 
                  needs_reauth: true,
                  last_error: 'Instagram token expired. Please reconnect your account.'
                })
                .eq('id', account.id);
            }
          } catch (e) {
            // Error parsing error response
          }
          
          continue;
        }

        const mediaData = await mediaResponse.json();
        console.log('[Instagram Analytics] Found posts:', mediaData.data?.length || 0);
        
        // Filter posts by date
        const postsInDateRange = (mediaData.data || []).filter((media: any) => {
          const postDate = new Date(media.timestamp);
          return postDate >= since;
        });
        
        console.log('[Instagram Analytics] Posts in date range (last', days, 'days):', postsInDateRange.length);
        
        if (days <= 7) {
          // For 7-day queries: Process all posts with full insights
          for (const media of postsInDateRange) {
            let saves = 0, reach = 0, impressions = 0;
            
            // Try to get insights for all posts
            try {
              const insightsUrl = `https://graph.facebook.com/v21.0/${media.id}/insights?metric=reach,impressions,saved&access_token=${account.access_token}`;
              const insightsResponse = await fetch(insightsUrl);
              
              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                if (insightsData.data && Array.isArray(insightsData.data)) {
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'reach' && metric.values?.[0]) {
                      reach = metric.values[0].value || 0;
                    }
                    if (metric.name === 'impressions' && metric.values?.[0]) {
                      impressions = metric.values[0].value || 0;
                    }
                    if (metric.name === 'saved' && metric.values?.[0]) {
                      saves = metric.values[0].value || 0;
                    }
                  });
                }
              }
            } catch (insightsError) {
              console.log(`Insights not available for media ${media.id}`);
            }
            
            const postMetrics = {
              id: media.id,
              caption: media.caption,
              media_type: media.media_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves,
              reach,
              impressions
            };
            
            allMetrics.posts.push(postMetrics);
            allMetrics.totalPosts++;
            allMetrics.totalEngagement += postMetrics.likes + postMetrics.comments + postMetrics.saves;
            allMetrics.totalReach += reach;
            allMetrics.totalImpressions += impressions;
          }
        } else {
          // For 30/90 day queries: Two-pass approach
          console.log('[Instagram Analytics] Pass 1: Calculating engagement for all posts');
          
          // Calculate engagement for all posts and sort
          const postsWithEngagement = postsInDateRange.map((media: any) => ({
            ...media,
            totalEngagement: (media.like_count || 0) + (media.comments_count || 0)
          }));
          
          // Sort by engagement and take top 10
          const topPosts = postsWithEngagement
            .sort((a: any, b: any) => b.totalEngagement - a.totalEngagement)
            .slice(0, 10);
          
          console.log('[Instagram Analytics] Pass 2: Getting insights for top', topPosts.length, 'posts');
          
          // Process top posts with insights
          for (let i = 0; i < topPosts.length; i++) {
            const media = topPosts[i];
            let saves = 0, reach = 0, impressions = 0;
            
            // Get insights for top 5 posts only
            if (i < 5) {
              try {
                const insightsUrl = `https://graph.facebook.com/v21.0/${media.id}/insights?metric=reach,impressions,saved&access_token=${account.access_token}`;
                const insightsResponse = await fetch(insightsUrl);
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  if (insightsData.data && Array.isArray(insightsData.data)) {
                    insightsData.data.forEach((metric: any) => {
                      if (metric.name === 'reach' && metric.values?.[0]) {
                        reach = metric.values[0].value || 0;
                      }
                      if (metric.name === 'impressions' && metric.values?.[0]) {
                        impressions = metric.values[0].value || 0;
                      }
                      if (metric.name === 'saved' && metric.values?.[0]) {
                        saves = metric.values[0].value || 0;
                      }
                    });
                  }
                }
              } catch (insightsError) {
                console.log(`Insights not available for media ${media.id}`);
              }
            }
            
            const postMetrics = {
              id: media.id,
              caption: media.caption,
              media_type: media.media_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves,
              reach,
              impressions
            };
            
            allMetrics.posts.push(postMetrics);
            allMetrics.totalPosts++;
            allMetrics.totalEngagement += postMetrics.likes + postMetrics.comments + postMetrics.saves;
            allMetrics.totalReach += reach;
            allMetrics.totalImpressions += impressions;
          }
        }
        
        // Cache successful data
        if (postsInDateRange.length > 0) {
          instagramCache.set(account.id, {
            data: {
              posts: allMetrics.posts.slice(-postsInDateRange.length), // Keep only posts from this account
              totalPosts: postsInDateRange.length,
              totalEngagement: allMetrics.totalEngagement,
              totalReach: allMetrics.totalReach,
              totalImpressions: allMetrics.totalImpressions
            },
            timestamp: Date.now()
          });
        }
      } catch (error: any) {
        console.error(`Error fetching data for Instagram account ${account.id}:`, error);
        
        // If token expired, try to return cached data
        if (error.message?.includes('token') || error.message?.includes('OAuth')) {
          const cached = instagramCache.get(account.id);
          if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            console.log('[Instagram Analytics] Using cached data for expired token');
            // Add cached data to allMetrics
            allMetrics.totalPosts += cached.data.totalPosts;
            allMetrics.totalEngagement += cached.data.totalEngagement;
            allMetrics.totalReach += cached.data.totalReach;
            allMetrics.totalImpressions += cached.data.totalImpressions;
            allMetrics.posts.push(...cached.data.posts);
          }
        }
      }
    }

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching Instagram analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram analytics' },
      { status: 500 }
    );
  }
}