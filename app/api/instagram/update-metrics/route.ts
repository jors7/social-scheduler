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
    
    console.log('Update metrics for user:', user.id);

    // Get all posted Instagram posts that need metrics update
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

    // Filter for posts that include Instagram
    const instagramPosts = posts?.filter(post => 
      post.platforms && Array.isArray(post.platforms) && 
      post.platforms.some((p: string) => p.toLowerCase() === 'instagram')
    ) || [];

    console.log('Found Instagram posts:', instagramPosts.length);

    if (instagramPosts.length === 0) {
      return NextResponse.json({ message: 'No Instagram posts to update' });
    }

    // Get Instagram account
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Instagram account not found' }, { status: 404 });
    }

    // Explicitly select the account
    const account = accountId
      ? accounts.find(acc => acc.id === accountId) || accounts[0]
      : accounts[0];

    if (!account) {
      return NextResponse.json(
        { error: 'Selected Instagram account not found' },
        { status: 404 }
      );
    }

    console.log(`[Instagram Update Metrics API] Using account: ${account.username || account.platform_user_id} (ID: ${account.id})`);

    let updatedCount = 0;
    const errors: any[] = [];

    // Update metrics for each Instagram post
    for (const post of instagramPosts) {
      if (post.post_results && Array.isArray(post.post_results)) {
        let updated = false;
        const updatedResults = await Promise.all(
          post.post_results.map(async (result: any) => {
            if (result.platform === 'instagram' && result.success && result.postId) {
              try {
                // Fetch current metrics from Instagram
                const mediaResponse = await fetch(
                  `https://graph.instagram.com/${result.postId}?fields=like_count,comments_count&access_token=${account.access_token}`
                );
                
                if (mediaResponse.ok) {
                  const mediaData = await mediaResponse.json();
                  
                  // Update the result with new metrics
                  updated = true;
                  return {
                    ...result,
                    data: {
                      ...result.data,
                      id: result.postId,
                      metrics: {
                        likes: mediaData.like_count || 0,
                        comments: mediaData.comments_count || 0,
                        saves: result.data?.metrics?.saves || 0,
                        shares: result.data?.metrics?.shares || 0,
                        impressions: result.data?.metrics?.impressions || 0,
                        reach: result.data?.metrics?.reach || 0
                      }
                    }
                  };
                } else {
                  console.error(`Failed to fetch metrics for post ${result.postId}`);
                  return result;
                }
              } catch (error) {
                console.error(`Error fetching metrics for post ${result.postId}:`, error);
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
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated metrics for ${updatedCount} posts`,
      totalPosts: instagramPosts.length,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Update metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update metrics' },
      { status: 500 }
    );
  }
}