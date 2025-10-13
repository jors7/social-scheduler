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
    media_product_type?: string;
    media_url?: string;
    permalink?: string;
    timestamp: string;
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    total_interactions: number;
    plays: number;
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

    console.log('[Instagram Analytics] ========== NEW REQUEST ==========');
    console.log('[Instagram Analytics] User ID:', user.id);

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

    console.log('[Instagram Analytics] Query:', { user_id: user.id, platform: 'instagram', is_active: true });
    console.log('[Instagram Analytics] Found accounts:', accounts?.length || 0);
    if (accounts && accounts.length > 0) {
      accounts.forEach(acc => {
        console.log(`[Instagram Analytics] Account: ${acc.id} - ${acc.username} - token: ${acc.access_token?.substring(0, 15)}...`);
      });
    }

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('[Instagram Analytics] No active Instagram accounts found');
      return NextResponse.json({
        metrics: {
          totalPosts: 0,
          totalEngagement: 0,
          totalReach: 0,
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
        // Get Instagram media using graph.instagram.com (not graph.facebook.com!)
        // Request media_product_type to distinguish between VIDEO and REELS
        const mediaUrl = `https://graph.instagram.com/${account.platform_user_id}/media?fields=id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count&limit=100&access_token=${account.access_token}`;
        console.log('[Instagram Analytics] Fetching media for account:', account.username || account.platform_user_id);
        console.log('[Instagram Analytics] Using URL:', mediaUrl.replace(account.access_token, 'TOKEN_HIDDEN'));
        
        const mediaResponse = await fetch(mediaUrl);
        
        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text();
          console.error(`[Instagram Analytics] Failed to fetch media for account ${account.id}:`, errorText);
          
          // Check if token is expired - but don't deactivate immediately
          // Token might be temporarily invalid due to Instagram API issues
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.code === 190) {
              console.log('[Instagram Analytics] Token error for account:', account.id);
              console.log('[Instagram Analytics] Error details:', errorData.error);
              // Don't deactivate - let user reconnect manually if needed
              // Deactivating automatically causes accounts to disappear unexpectedly
            }
          } catch (e) {
            // Error parsing error response
          }

          continue;
        }

        const mediaData = await mediaResponse.json();
        console.log('[Instagram Analytics] Found posts:', mediaData.data?.length || 0);

        // Log post dates for debugging
        if (mediaData.data && mediaData.data.length > 0) {
          console.log('[Instagram Analytics] Post dates:');
          mediaData.data.forEach((media: any, idx: number) => {
            const postDate = new Date(media.timestamp);
            console.log(`  Post ${idx + 1}: ${postDate.toISOString()} (${media.caption?.substring(0, 30) || 'No caption'}...)`);
          });
          console.log('[Instagram Analytics] Date filter cutoff:', since.toISOString());
        }

        // Filter posts by date
        const postsInDateRange = (mediaData.data || []).filter((media: any) => {
          const postDate = new Date(media.timestamp);
          return postDate >= since;
        });

        console.log('[Instagram Analytics] Posts in date range (last', days, 'days):', postsInDateRange.length);

        // Process all posts with full insights regardless of date range
        for (const media of postsInDateRange) {
            let saves = 0, reach = 0, total_interactions = 0, plays = 0;

            // Try to get insights for all posts (impressions deprecated April 2025)
            // For reels, we fetch "plays" metric which represents views
            try {
              // Determine metrics to fetch based on media product type
              // media_product_type can be: FEED, REELS, STORY, etc.
              // Only REELS support the "plays" metric
              const isReel = media.media_product_type === 'REELS';
              const metrics = isReel
                ? 'reach,saved,total_interactions,plays'
                : 'reach,saved,total_interactions';

              const insightsUrl = `https://graph.instagram.com/${media.id}/insights?metric=${metrics}&access_token=${account.access_token}`;
              console.log(`[Instagram Analytics] Fetching insights for media ${media.id} (type: ${media.media_type}, product: ${media.media_product_type || 'N/A'})`);

              const insightsResponse = await fetch(insightsUrl);

              if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                console.log(`[Instagram Analytics] Insights response for ${media.id}:`, JSON.stringify(insightsData, null, 2));

                if (insightsData.data && Array.isArray(insightsData.data)) {
                  insightsData.data.forEach((metric: any) => {
                    if (metric.name === 'reach' && metric.values?.[0]) {
                      reach = metric.values[0].value || 0;
                      console.log(`[Instagram Analytics] ✓ Reach for ${media.id}: ${reach}`);
                    }
                    if (metric.name === 'saved' && metric.values?.[0]) {
                      saves = metric.values[0].value || 0;
                    }
                    if (metric.name === 'total_interactions' && metric.values?.[0]) {
                      total_interactions = metric.values[0].value || 0;
                    }
                    if (metric.name === 'plays' && metric.values?.[0]) {
                      plays = metric.values[0].value || 0;
                      console.log(`[Instagram Analytics] ✓ Plays for ${media.id}: ${plays}`);
                    }
                  });
                }
              } else {
                const errorText = await insightsResponse.text();
                console.error(`[Instagram Analytics] ✗ Insights API failed for media ${media.id} (${media.media_type}):`);
                console.error(`[Instagram Analytics]   Status: ${insightsResponse.status} ${insightsResponse.statusText}`);
                console.error(`[Instagram Analytics]   Error: ${errorText}`);

                // Try to parse error details
                try {
                  const errorData = JSON.parse(errorText);
                  if (errorData.error) {
                    console.error(`[Instagram Analytics]   Error code: ${errorData.error.code}`);
                    console.error(`[Instagram Analytics]   Error message: ${errorData.error.message}`);
                    console.error(`[Instagram Analytics]   Error type: ${errorData.error.type}`);

                    // If plays metric is not supported, retry without it
                    if (errorData.error.message?.includes('plays metric') && isReel) {
                      console.log(`[Instagram Analytics] ⚠ Retrying without 'plays' metric for ${media.id}`);
                      const fallbackMetrics = 'reach,saved,total_interactions';
                      const fallbackUrl = `https://graph.instagram.com/${media.id}/insights?metric=${fallbackMetrics}&access_token=${account.access_token}`;

                      const fallbackResponse = await fetch(fallbackUrl);
                      if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        console.log(`[Instagram Analytics] ✓ Fallback successful for ${media.id}`);

                        if (fallbackData.data && Array.isArray(fallbackData.data)) {
                          fallbackData.data.forEach((metric: any) => {
                            if (metric.name === 'reach' && metric.values?.[0]) {
                              reach = metric.values[0].value || 0;
                              console.log(`[Instagram Analytics] ✓ Reach for ${media.id}: ${reach}`);
                            }
                            if (metric.name === 'saved' && metric.values?.[0]) {
                              saves = metric.values[0].value || 0;
                            }
                            if (metric.name === 'total_interactions' && metric.values?.[0]) {
                              total_interactions = metric.values[0].value || 0;
                            }
                          });
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Error response not JSON
                }
              }
            } catch (insightsError: any) {
              console.error(`[Instagram Analytics] ✗ Exception fetching insights for media ${media.id}:`, insightsError.message);
              console.error(`[Instagram Analytics]   Full error:`, insightsError);
            }

            const postMetrics = {
              id: media.id,
              caption: media.caption,
              media_type: media.media_type,
              media_product_type: media.media_product_type,
              media_url: media.media_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likes: media.like_count || 0,
              comments: media.comments_count || 0,
              saves,
              reach,
              total_interactions,
              plays, // Video views for Reels only
              impressions: reach // Use reach as impressions for Instagram (impressions metric deprecated)
            };

            allMetrics.posts.push(postMetrics);
            allMetrics.totalPosts++;
            allMetrics.totalEngagement += postMetrics.likes + postMetrics.comments + postMetrics.saves;
            allMetrics.totalReach += reach;
            allMetrics.totalImpressions += reach; // Use reach as impressions for Instagram

            // Log summary for this post
            console.log(`[Instagram Analytics] Post summary for ${media.id}:`);
            console.log(`  - Media type: ${media.media_type}, Product type: ${media.media_product_type || 'N/A'}`);
            console.log(`  - Likes: ${postMetrics.likes}, Comments: ${postMetrics.comments}, Saves: ${saves}`);
            console.log(`  - Reach: ${reach}, Plays: ${plays}, Impressions: ${reach}`);
            console.log(`  - Caption: ${media.caption?.substring(0, 50) || 'No caption'}...`);
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
            allMetrics.totalImpressions += cached.data.totalImpressions || 0;
            allMetrics.posts.push(...cached.data.posts);
          }
        }
      }
    }

    console.log('[Instagram Analytics] ========== FINAL METRICS ==========');
    console.log('[Instagram Analytics] Total Posts:', allMetrics.totalPosts);
    console.log('[Instagram Analytics] Total Engagement:', allMetrics.totalEngagement);
    console.log('[Instagram Analytics] Total Reach:', allMetrics.totalReach);
    console.log('[Instagram Analytics] Total Impressions:', allMetrics.totalImpressions);
    console.log('[Instagram Analytics] Posts array length:', allMetrics.posts.length);

    return NextResponse.json({ metrics: allMetrics });

  } catch (error) {
    console.error('Error fetching Instagram analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Instagram analytics' },
      { status: 500 }
    );
  }
}