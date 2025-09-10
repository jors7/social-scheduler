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
    
    console.log('Update Threads metrics for user:', user.id);

    // Get all posted Threads posts that need metrics update
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

    // Filter for posts that include Threads
    const threadsPosts = posts?.filter(post => 
      post.platforms && Array.isArray(post.platforms) && 
      post.platforms.some((p: string) => p.toLowerCase() === 'threads')
    ) || [];

    console.log('Found Threads posts:', threadsPosts.length);

    if (threadsPosts.length === 0) {
      return NextResponse.json({ message: 'No Threads posts to update' });
    }

    // Get Threads account
    const { data: accounts, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .eq('is_active', true);

    if (accountError || !accounts || accounts.length === 0) {
      console.log('No active Threads account found');
      return NextResponse.json({ error: 'Threads account not found' }, { status: 404 });
    }

    const account = accounts[0]; // Use the first active Threads account

    let updatedCount = 0;
    const errors: any[] = [];

    // Update metrics for each Threads post
    for (const post of threadsPosts) {
      if (post.post_results && Array.isArray(post.post_results)) {
        let updated = false;
        const updatedResults = await Promise.all(
          post.post_results.map(async (result: any) => {
            if (result.platform === 'threads' && result.success && result.postId) {
              try {
                console.log('Fetching metrics for Threads post:', result.postId);
                
                // Fetch current metrics from Threads API
                // Using the media endpoint to get basic metrics
                const mediaResponse = await fetch(
                  `https://graph.threads.net/v1.0/${result.postId}?fields=id,text,username,permalink,timestamp,media_type,media_url,shortcode,thumbnail_url,children,is_quote_post&access_token=${account.access_token}`
                );
                
                if (mediaResponse.ok) {
                  const mediaData = await mediaResponse.json();
                  console.log('Threads media data:', mediaData);
                  
                  // Try to fetch insights if available
                  let metrics = {
                    views: 0,
                    likes: 0,
                    replies: 0,
                    reposts: 0,
                    quotes: 0,
                    shares: 0
                  };
                  
                  try {
                    // Attempt to fetch insights (may fail without threads_manage_insights)
                    const insightsResponse = await fetch(
                      `https://graph.threads.net/v1.0/${result.postId}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${account.access_token}`
                    );
                    
                    if (insightsResponse.ok) {
                      const insightsData = await insightsResponse.json();
                      console.log('Threads insights data:', insightsData);
                      
                      // Parse insights data
                      if (insightsData.data && Array.isArray(insightsData.data)) {
                        insightsData.data.forEach((metric: any) => {
                          if (metric.name && metric.values && metric.values[0]) {
                            metrics[metric.name as keyof typeof metrics] = metric.values[0].value || 0;
                          }
                        });
                      }
                    } else {
                      console.log('Could not fetch Threads insights (permission may be missing)');
                    }
                  } catch (insightsError) {
                    console.log('Insights fetch failed, using default metrics:', insightsError);
                  }
                  
                  // Update the result with new metrics
                  updated = true;
                  return {
                    ...result,
                    data: {
                      ...result.data,
                      id: result.postId,
                      permalink: mediaData.permalink,
                      metrics
                    }
                  };
                } else {
                  const errorText = await mediaResponse.text();
                  console.error(`Failed to fetch metrics for Threads post ${result.postId}:`, errorText);
                  return result;
                }
              } catch (error) {
                console.error(`Error fetching metrics for Threads post ${result.postId}:`, error);
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
      message: `Updated metrics for ${updatedCount} Threads posts`,
      totalPosts: threadsPosts.length,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Update Threads metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Threads metrics' },
      { status: 500 }
    );
  }
}