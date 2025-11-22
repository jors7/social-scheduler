import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper function to check Twitter limits for scheduling
async function checkTwitterScheduleLimit(userId: string, scheduledDate: Date): Promise<{ allowed: boolean; message?: string }> {
  const userLimit = parseInt(process.env.TWITTER_USER_DAILY_LIMIT || '2');
  const dateStr = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Create service role client for database function
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Use the database function to count user's posts for the scheduled date
  const { data, error } = await supabaseService
    .rpc('count_user_twitter_posts', {
      user_uuid: userId,
      check_date: dateStr
    });

  if (error) {
    console.error('Error calling count_user_twitter_posts:', error);
    // If function doesn't exist, fall back to manual counting
    // Count scheduled posts for this user on this date - fetch and filter manually
    const { data: scheduledPosts } = await supabaseService
      .from('scheduled_posts')
      .select('platforms')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_for', `${dateStr}T00:00:00`)
      .lt('scheduled_for', `${dateStr}T23:59:59`);

    // Filter posts that include twitter or x platform
    const twitterPosts = scheduledPosts?.filter(post =>
      post.platforms && (
        post.platforms.includes('twitter') ||
        post.platforms.includes('x')
      )
    ) || [];

    const scheduledCount = twitterPosts.length;

    const used = scheduledCount || 0;
    console.log(`Fallback count for user ${userId} on ${dateStr}: ${used} scheduled tweets`);

    if (used >= userLimit) {
      return {
        allowed: false,
        message: `You've already scheduled ${used} Twitter posts for ${dateStr}. To conserve API resources, we currently limit posts to ${userLimit} per day per user.`
      };
    }
    return { allowed: true };
  }

  const used = data || 0;
  console.log(`User ${userId} has ${used} Twitter posts scheduled/posted for ${dateStr}`)

  if (used >= userLimit) {
    return {
      allowed: false,
      message: `You've already scheduled ${used} Twitter posts for ${dateStr}. To conserve API resources, we currently limit posts to ${userLimit} per day per user.`
    };
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Schedule request body:', JSON.stringify(body, null, 2));

    const { content, platforms, platformContent, mediaUrls, scheduledFor, pinterestBoardId, pinterestTitle, pinterestDescription, pinterestLink, threadsMode, threadPosts, threadsThreadMedia, instagramAsStory, instagramAsReel, facebookAsStory, facebookAsReel, youtubeAsShort, selectedAccounts } = body;

    // Check if this is a Pinterest-only post with media
    const isPinterestOnlyWithMedia = platforms?.length === 1 &&
                                     platforms[0] === 'pinterest' &&
                                     pinterestBoardId &&
                                     mediaUrls?.length > 0;

    // Check if this is a Threads thread mode post
    const isThreadsThreadMode = platforms?.length === 1 &&
                                platforms[0] === 'threads' &&
                                threadsMode === 'thread' &&
                                threadPosts && threadPosts.length > 0;

    // Check if this is a Facebook post with media (stories, reels, or feed posts don't require captions)
    const isFacebookOnlyWithMedia = platforms?.length === 1 &&
                                    platforms[0] === 'facebook' &&
                                    mediaUrls?.length > 0;

    // Check if this is an Instagram Story with media (stories don't require captions)
    const isInstagramStoryWithMedia = platforms?.length === 1 &&
                                      platforms[0] === 'instagram' &&
                                      instagramAsStory &&
                                      mediaUrls?.length > 0;

    // Validate inputs - allow empty content for Pinterest-only posts with media, Threads thread mode, Facebook posts with media, or Instagram Stories with media
    if ((!content && !isPinterestOnlyWithMedia && !isThreadsThreadMode && !isFacebookOnlyWithMedia && !isInstagramStoryWithMedia) || !platforms || platforms.length === 0 || !scheduledFor) {
      console.log('Validation failed:', {
        hasContent: !!content,
        hasPlatforms: !!platforms,
        platformsLength: platforms?.length,
        hasScheduledFor: !!scheduledFor,
        isPinterestOnlyWithMedia,
        isThreadsThreadMode,
        isFacebookOnlyWithMedia,
        isInstagramStoryWithMedia
      });
      return NextResponse.json({
        error: 'Missing required fields',
        details: {
          content: (!content && !isPinterestOnlyWithMedia && !isThreadsThreadMode && !isFacebookOnlyWithMedia && !isInstagramStoryWithMedia) ? 'Content is required' : 'OK',
          platforms: !platforms || platforms.length === 0 ? 'At least one platform is required' : 'OK',
          scheduledFor: !scheduledFor ? 'Scheduled time is required' : 'OK'
        }
      }, { status: 400 });
    }

    // Validate scheduled time is in the future (allow 5 minutes tolerance for timezone/clock differences)
    const scheduledDate = new Date(scheduledFor);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    console.log('Time validation:', {
      scheduledFor: scheduledDate.toISOString(),
      serverTime: now.toISOString(),
      fiveMinutesAgo: fiveMinutesAgo.toISOString(),
      isValid: scheduledDate > fiveMinutesAgo
    });
    
    if (scheduledDate <= fiveMinutesAgo) {
      return NextResponse.json({
        error: 'Scheduled time must be in the future',
        details: {
          scheduledFor: scheduledDate.toISOString(),
          serverTime: now.toISOString(),
          message: 'Please schedule at least 5 minutes from now'
        }
      }, { status: 400 });
    }

    // Check Twitter daily limit if Twitter is selected
    if ((platforms.includes('twitter') || platforms.includes('x')) && user) {
      const limitCheck = await checkTwitterScheduleLimit(user.id, scheduledDate);
      if (!limitCheck.allowed) {
        console.log(`User ${user.id} reached Twitter scheduling limit for ${scheduledDate.toISOString().split('T')[0]}`);
        return NextResponse.json({
          error: limitCheck.message,
          limitReached: true
        }, { status: 429 });
      }
    }

    // Save to database WITHOUT .select() to avoid type casting issue
    // Build insert object conditionally to avoid trigger issues
    const insertData: any = {
      user_id: user.id,
      content: content || '', // Use empty string if no content (for Pinterest-only posts)
      platforms: platforms, // Keep as array - Supabase should handle JSONB conversion
      platform_content: platformContent || {},
      scheduled_for: scheduledFor,
      status: 'pending'
    };
    
    // Set media_urls to empty array if not provided to avoid null issues
    // This ensures the JSONB field always has a valid array value
    insertData.media_urls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : [];

    // Extract platform_media_url from first media URL for thumbnail display
    console.log('[Scheduled POST] mediaUrls:', JSON.stringify(mediaUrls));
    if (mediaUrls && mediaUrls.length > 0) {
      const firstMedia = mediaUrls[0];
      console.log('[Scheduled POST] firstMedia type:', typeof firstMedia, 'value:', firstMedia);

      if (typeof firstMedia === 'string') {
        insertData.platform_media_url = firstMedia;
        console.log('[Scheduled POST] Set platform_media_url (string):', insertData.platform_media_url);
      } else if (firstMedia && typeof firstMedia === 'object') {
        // Handle object format: { url: '...', thumbnailUrl: '...' }
        insertData.platform_media_url = firstMedia.thumbnailUrl || firstMedia.url || null;
        console.log('[Scheduled POST] Set platform_media_url (object):', insertData.platform_media_url);
      }
    }

    // Add selected accounts if provided (for multi-account platforms)
    if (selectedAccounts && Object.keys(selectedAccounts).length > 0) {
      insertData.selected_accounts = selectedAccounts;
    }

    // Add Pinterest-specific fields if provided
    if (pinterestBoardId) {
      insertData.pinterest_board_id = pinterestBoardId;
    }
    if (pinterestTitle) {
      insertData.pinterest_title = pinterestTitle;
    }
    if (pinterestDescription) {
      insertData.pinterest_description = pinterestDescription;
    }
    if (pinterestLink) {
      insertData.pinterest_link = pinterestLink;
    }

    // Add Threads thread-specific fields if provided
    if (threadsMode) {
      insertData.threads_mode = threadsMode;
    }
    if (threadPosts && threadPosts.length > 0) {
      insertData.thread_posts = threadPosts;
    }
    if (threadsThreadMedia) {
      insertData.threads_thread_media = threadsThreadMedia;
    }

    // Add format flags if provided
    if (instagramAsStory !== undefined) {
      insertData.instagram_as_story = instagramAsStory;
    }
    if (instagramAsReel !== undefined) {
      insertData.instagram_as_reel = instagramAsReel;
    }
    if (facebookAsStory !== undefined) {
      insertData.facebook_as_story = facebookAsStory;
    }
    if (facebookAsReel !== undefined) {
      insertData.facebook_as_reel = facebookAsReel;
    }
    if (youtubeAsShort !== undefined) {
      insertData.youtube_as_short = youtubeAsShort;
    }

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert(insertData);

    if (error) {
      console.error('Database insert error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({ 
        error: 'Failed to schedule post',
        details: error.message 
      }, { status: 500 });
    }

    // Return success even without the full post data
    return NextResponse.json({ 
      success: true,
      message: 'Post scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get status from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id);

    // Only filter by status if provided
    if (status && status !== 'all') {
      // Handle multiple statuses separated by comma
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
    }

    // Fetch scheduled posts - newest first
    const { data: posts, error } = await query.order('scheduled_for', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: []
      });
    }

    // Enhance posts with platform_media_url if missing (for backward compatibility with old posts)
    const enhancedPosts = posts.map(post => {
      // If platform_media_url is already set, use it
      if (post.platform_media_url) {
        console.log(`[Scheduled GET] Post ${post.id} already has platform_media_url:`, post.platform_media_url);
        return post;
      }

      // Otherwise, extract from media_urls for backward compatibility
      let platformMediaUrl = null;
      console.log(`[Scheduled GET] Post ${post.id} media_urls:`, JSON.stringify(post.media_urls));

      if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
        const firstMedia = post.media_urls[0];
        console.log(`[Scheduled GET] Post ${post.id} firstMedia type:`, typeof firstMedia, 'value:', firstMedia);

        if (typeof firstMedia === 'string') {
          platformMediaUrl = firstMedia;
          console.log(`[Scheduled GET] Post ${post.id} extracted string URL:`, platformMediaUrl);
        } else if (firstMedia && typeof firstMedia === 'object') {
          // Handle object format: { url: '...', thumbnailUrl: '...' }
          platformMediaUrl = firstMedia.thumbnailUrl || firstMedia.url || null;
          console.log(`[Scheduled GET] Post ${post.id} extracted object URL:`, platformMediaUrl);
        }
      } else {
        console.log(`[Scheduled GET] Post ${post.id} has no valid media_urls`);
      }

      return {
        ...post,
        platform_media_url: platformMediaUrl
      };
    });

    return NextResponse.json({
      success: true,
      posts: enhancedPosts
    });

  } catch (error) {
    console.error('Get scheduled posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  console.log('PATCH /api/posts/schedule called');
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('PATCH request body:', JSON.stringify(body, null, 2));
    const { postId, scheduledFor, status, content, platforms, platformContent, mediaUrls,
            pinterestBoardId, pinterestTitle, pinterestDescription, pinterestLink,
            instagram_as_story, instagram_as_reel, facebook_as_story, facebook_as_reel, youtube_as_short } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Build update object - only include fields that are provided
    const updateData: any = {};
    
    if (scheduledFor !== undefined) {
      const scheduledDate = new Date(scheduledFor);
      console.log('Updating scheduled_for to:', scheduledDate.toISOString());
      updateData.scheduled_for = scheduledDate.toISOString();
    }
    
    if (status !== undefined) updateData.status = status;
    if (content !== undefined) updateData.content = content;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (platformContent !== undefined) updateData.platform_content = platformContent;
    if (mediaUrls !== undefined) {
      updateData.media_urls = mediaUrls;

      // Extract platform_media_url from first media URL for thumbnail display
      if (mediaUrls && mediaUrls.length > 0) {
        const firstMedia = mediaUrls[0];
        if (typeof firstMedia === 'string') {
          updateData.platform_media_url = firstMedia;
        } else if (firstMedia && typeof firstMedia === 'object') {
          // Handle object format: { url: '...', thumbnailUrl: '...' }
          updateData.platform_media_url = firstMedia.thumbnailUrl || firstMedia.url || null;
        }
      } else {
        // If media_urls is being cleared, clear platform_media_url too
        updateData.platform_media_url = null;
      }
    }
    if (pinterestBoardId !== undefined) updateData.pinterest_board_id = pinterestBoardId;
    if (pinterestTitle !== undefined) updateData.pinterest_title = pinterestTitle;
    if (pinterestDescription !== undefined) updateData.pinterest_description = pinterestDescription;
    if (pinterestLink !== undefined) updateData.pinterest_link = pinterestLink;
    // Update format flags if provided
    if (instagram_as_story !== undefined) updateData.instagram_as_story = instagram_as_story;
    if (instagram_as_reel !== undefined) updateData.instagram_as_reel = instagram_as_reel;
    if (facebook_as_story !== undefined) updateData.facebook_as_story = facebook_as_story;
    if (facebook_as_reel !== undefined) updateData.facebook_as_reel = facebook_as_reel;
    if (youtube_as_short !== undefined) updateData.youtube_as_short = youtube_as_short;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }
    
    console.log('Update data:', updateData);

    // First verify the post exists and belongs to the user
    // Also fetch platforms to check if Twitter limit applies
    const { data: existingPost, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('id, user_id, platforms')
      .eq('id', postId)
      .single();
    
    if (fetchError || !existingPost) {
      console.error('Post not found:', fetchError);
      return NextResponse.json({ 
        error: 'Post not found',
        postId: postId
      }, { status: 404 });
    }
    
    if (existingPost.user_id !== user.id) {
      return NextResponse.json({
        error: 'Unauthorized to update this post'
      }, { status: 403 });
    }

    // Check Twitter limit if updating schedule date and post includes Twitter
    if (scheduledFor !== undefined && existingPost.platforms &&
        (existingPost.platforms.includes('twitter') || existingPost.platforms.includes('x'))) {
      const scheduledDate = new Date(scheduledFor);
      const limitCheck = await checkTwitterScheduleLimit(user.id, scheduledDate);
      if (!limitCheck.allowed) {
        console.log(`User ${user.id} reached Twitter limit when rescheduling post ${postId} to ${scheduledDate.toISOString().split('T')[0]}`);
        return NextResponse.json({
          error: limitCheck.message,
          limitReached: true
        }, { status: 429 });
      }
    }

    // Update WITHOUT .select() to avoid type casting issues
    const { error: updateError } = await supabase
      .from('scheduled_posts')
      .update(updateData)
      .eq('id', postId)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Database update error:', updateError);
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      
      return NextResponse.json({ 
        error: 'Failed to update scheduled post',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 });
    }
    
    console.log('Successfully updated post:', postId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Post updated successfully',
      postId: postId
    });

  } catch (error) {
    console.error('PATCH scheduled posts error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update scheduled post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete the scheduled post
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id); // Ensure user can only delete their own posts

    if (error) {
      console.error('Database delete error:', error);
      return NextResponse.json({ error: 'Failed to delete scheduled post' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Scheduled post deleted successfully'
    });

  } catch (error) {
    console.error('DELETE scheduled posts error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled post' },
      { status: 500 }
    );
  }
}