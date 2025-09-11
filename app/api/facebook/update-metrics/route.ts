import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Update Facebook metrics for user:', user.id);

    // Get all posted Facebook posts that need metrics update
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted');

    if (postsError) {
      console.error('Error fetching posts:', JSON.stringify(postsError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch posts', 
        details: postsError.message 
      }, { status: 500 });
    }

    console.log('Found posts:', posts?.length || 0);

    // Filter for posts that include Facebook
    const facebookPosts = posts?.filter(post => 
      post.platforms && Array.isArray(post.platforms) && 
      post.platforms.some((p: string) => p.toLowerCase() === 'facebook')
    ) || [];

    console.log('Found Facebook posts:', facebookPosts.length);

    if (facebookPosts.length === 0) {
      return NextResponse.json({ message: 'No Facebook posts to update' });
    }

    // Get Facebook account
    const { data: accounts, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);

    if (accountError || !accounts || accounts.length === 0) {
      console.log('No active Facebook account found');
      return NextResponse.json({ error: 'Facebook account not found' }, { status: 404 });
    }

    const account = accounts[0]; // Use the first active Facebook account

    let updatedCount = 0;
    const errors: any[] = [];

    // Update metrics for each Facebook post
    for (const post of facebookPosts) {
      if (post.post_results && Array.isArray(post.post_results)) {
        let updated = false;
        const updatedResults = await Promise.all(
          post.post_results.map(async (result: any) => {
            if (result.platform === 'facebook' && result.success && result.postId) {
              try {
                console.log('Fetching metrics for Facebook post:', result.postId);
                
                // Fetch current metrics from Facebook API
                const insightsUrl = `https://graph.facebook.com/v18.0/${result.postId}/insights?metric=post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total&access_token=${account.access_token}`;
                const insightsResponse = await fetch(insightsUrl);
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  console.log('Facebook insights data:', insightsData);
                  
                  const metrics: any = {
                    impressions: 0,
                    engagement: 0,
                    clicks: 0,
                    reactions: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0
                  };
                  
                  // Parse insights data
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
                  const engagementUrl = `https://graph.facebook.com/v18.0/${result.postId}?fields=comments.summary(true),shares,permalink_url&access_token=${account.access_token}`;
                  const engagementResponse = await fetch(engagementUrl);
                  
                  if (engagementResponse.ok) {
                    const engagementData = await engagementResponse.json();
                    metrics.comments = engagementData.comments?.summary?.total_count || 0;
                    metrics.shares = engagementData.shares?.count || 0;
                    
                    // Update the result with new metrics
                    updated = true;
                    return {
                      ...result,
                      data: {
                        ...result.data,
                        id: result.postId,
                        permalink: engagementData.permalink_url,
                        metrics
                      }
                    };
                  }
                } else {
                  const errorText = await insightsResponse.text();
                  console.error(`Failed to fetch metrics for Facebook post ${result.postId}:`, errorText);
                  return result;
                }
              } catch (error) {
                console.error(`Error fetching metrics for Facebook post ${result.postId}:`, error);
                errors.push({ postId: result.postId, error: error instanceof Error ? error.message : 'Unknown error' });
                return result;
              }
            }
            return result;
          })
        );

        // Update the post in the database if metrics were updated
        if (updated) {
          const { error: updateError } = await supabase
            .from('scheduled_posts')
            .update({ post_results: updatedResults })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Error updating post ${post.id}:`, updateError);
            errors.push({ postId: post.id, error: updateError.message });
          } else {
            updatedCount++;
            console.log(`Updated metrics for post ${post.id}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated metrics for ${updatedCount} Facebook posts`,
      totalPosts: facebookPosts.length,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Update Facebook metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Facebook metrics' },
      { status: 500 }
    );
  }
}