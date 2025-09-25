import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/facebook/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all posted posts
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(100); // Limit to recent posts

    if (postsError) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'No posted posts to update' });
    }

    // Get social accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError || !accounts) {
      return NextResponse.json({ error: 'Failed to fetch social accounts' }, { status: 500 });
    }

    // Create a map of accounts by platform
    const accountMap = new Map();
    accounts.forEach(account => {
      accountMap.set(account.platform, account);
    });

    let updatedCount = 0;
    const errors: any[] = [];

    // Update metrics for each post
    for (const post of posts) {
      if (!post.post_results || !Array.isArray(post.post_results)) {
        continue;
      }

      let hasUpdates = false;
      const updatedResults = [...post.post_results];

      for (let i = 0; i < updatedResults.length; i++) {
        const result = updatedResults[i];
        
        if (!result.success || !result.data) {
          continue;
        }

        const account = accountMap.get(result.platform);
        if (!account) {
          continue;
        }

        try {
          // Fetch fresh metrics based on platform
          switch (result.platform) {
            case 'facebook':
              // Facebook posts may have either 'id' or 'postId'
              const fbPostId = result.data.id || result.data.postId;
              if (fbPostId && account.access_token) {
                const metrics = await fetchFacebookPostMetrics(
                  fbPostId,
                  account.access_token
                );
                if (metrics) {
                  updatedResults[i] = {
                    ...result,
                    data: {
                      ...result.data,
                      metrics
                    }
                  };
                  hasUpdates = true;
                }
              }
              break;

            case 'instagram':
              if (result.data.id && account.access_token) {
                const metrics = await fetchInstagramPostMetrics(
                  result.data.id,
                  account.access_token
                );
                if (metrics) {
                  updatedResults[i] = {
                    ...result,
                    data: {
                      ...result.data,
                      metrics
                    }
                  };
                  hasUpdates = true;
                }
              }
              break;

            case 'threads':
              if (result.data.id && account.access_token) {
                const metrics = await fetchThreadsPostMetrics(
                  result.data.id,
                  account.access_token
                );
                if (metrics) {
                  updatedResults[i] = {
                    ...result,
                    data: {
                      ...result.data,
                      metrics
                    }
                  };
                  hasUpdates = true;
                }
              }
              break;
            
            case 'bluesky':
              // For Bluesky, ensure metrics object exists even if we can't fetch real metrics
              if ((result.data.uri || result.data.cid) && !result.data.metrics) {
                // Set default metrics for Bluesky if they don't exist
                updatedResults[i] = {
                  ...result,
                  data: {
                    ...result.data,
                    metrics: {
                      likes: 0,
                      reposts: 0,
                      replies: 0,
                      quotes: 0,
                      views: 0,
                      impressions: 0,
                      reach: 0
                    }
                  }
                };
                hasUpdates = true; // Mark as updated so it gets saved
              }
              break;
          }
        } catch (error: any) {
          errors.push({
            postId: post.id,
            platform: result.platform,
            error: error.message
          });
        }
      }

      // Update the post if metrics were fetched
      if (hasUpdates) {
        const { error: updateError } = await supabase
          .from('scheduled_posts')
          .update({ post_results: updatedResults })
          .eq('id', post.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated metrics for ${updatedCount} posts`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error updating post metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update post metrics' },
      { status: 500 }
    );
  }
}

// Helper function to fetch Facebook post metrics
async function fetchFacebookPostMetrics(postId: string, accessToken: string) {
  try {
    // First get basic engagement metrics
    const engagementUrl = `https://graph.facebook.com/v21.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${accessToken}`;
    const engagementResponse = await fetch(engagementUrl);
    
    if (!engagementResponse.ok) {
      return null;
    }
    
    const engagementData = await engagementResponse.json();
    
    // Try to get insights (may not be available for all post types)
    const insightsUrl = `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    
    let impressions = 0;
    let reach = 0;
    
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      if (insightsData.data && Array.isArray(insightsData.data)) {
        insightsData.data.forEach((metric: any) => {
          if (metric.name === 'post_impressions' && metric.values?.[0]) {
            impressions = metric.values[0].value || 0;
          }
          if (metric.name === 'post_engaged_users' && metric.values?.[0]) {
            reach = metric.values[0].value || 0;
          }
        });
      }
    }
    
    return {
      likes: engagementData.likes?.summary?.total_count || 0,
      comments: engagementData.comments?.summary?.total_count || 0,
      shares: engagementData.shares?.count || 0,
      reactions: engagementData.reactions?.summary?.total_count || 0,
      impressions,
      reach: reach || impressions, // Fallback to impressions if reach not available
      views: impressions // Facebook uses impressions as views
    };
  } catch (error) {
    console.error('Error fetching Facebook metrics:', error);
    return null;
  }
}

// Helper function to fetch Instagram post metrics
async function fetchInstagramPostMetrics(mediaId: string, accessToken: string) {
  try {
    const url = `https://graph.facebook.com/v21.0/${mediaId}?fields=like_count,comments_count,saved,reach,impressions&access_token=${accessToken}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      saves: data.saved || 0,
      shares: 0, // Instagram doesn't provide share count via API
      impressions: data.impressions || 0,
      reach: data.reach || 0,
      views: data.impressions || 0
    };
  } catch (error) {
    console.error('Error fetching Instagram metrics:', error);
    return null;
  }
}

// Helper function to fetch Threads post metrics
async function fetchThreadsPostMetrics(mediaId: string, accessToken: string) {
  try {
    const url = `https://graph.threads.net/v1.0/${mediaId}?fields=likes_count,replies_count,reposts_count,quotes_count,views_count&access_token=${accessToken}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return {
      likes: data.likes_count || 0,
      replies: data.replies_count || 0,
      reposts: data.reposts_count || 0,
      quotes: data.quotes_count || 0,
      views: data.views_count || 0,
      impressions: data.views_count || 0,
      reach: data.views_count || 0
    };
  } catch (error) {
    console.error('Error fetching Threads metrics:', error);
    return null;
  }
}