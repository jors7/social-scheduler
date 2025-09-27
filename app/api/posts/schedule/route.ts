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

  const used = data || 0;

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
    
    const { content, platforms, platformContent, mediaUrls, scheduledFor, pinterestBoardId, pinterestTitle, pinterestDescription, pinterestLink } = body;

    // Check if this is a Pinterest-only post with media
    const isPinterestOnlyWithMedia = platforms?.length === 1 && 
                                     platforms[0] === 'pinterest' && 
                                     pinterestBoardId && 
                                     mediaUrls?.length > 0;

    // Validate inputs - allow empty content for Pinterest-only posts with media
    if ((!content && !isPinterestOnlyWithMedia) || !platforms || platforms.length === 0 || !scheduledFor) {
      console.log('Validation failed:', {
        hasContent: !!content,
        hasPlatforms: !!platforms,
        platformsLength: platforms?.length,
        hasScheduledFor: !!scheduledFor,
        isPinterestOnlyWithMedia
      });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: {
          content: (!content && !isPinterestOnlyWithMedia) ? 'Content is required' : 'OK',
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
    const { data, error } = await query.order('scheduled_for', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      posts: data || [] 
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
            pinterestBoardId, pinterestTitle, pinterestDescription, pinterestLink } = body;

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
    if (mediaUrls !== undefined) updateData.media_urls = mediaUrls;
    if (pinterestBoardId !== undefined) updateData.pinterest_board_id = pinterestBoardId;
    if (pinterestTitle !== undefined) updateData.pinterest_title = pinterestTitle;
    if (pinterestDescription !== undefined) updateData.pinterest_description = pinterestDescription;
    if (pinterestLink !== undefined) updateData.pinterest_link = pinterestLink;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }
    
    console.log('Update data:', updateData);

    // First verify the post exists and belongs to the user
    const { data: existingPost, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('id, user_id')
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