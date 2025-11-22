import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/posts/scheduled/[id] - Fetch a specific scheduled post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the scheduled post
    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching scheduled post:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled post' },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error in GET /api/posts/scheduled/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/posts/scheduled/[id] - Update a scheduled post
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      content,
      platforms,
      platform_content,
      media_urls,
      scheduled_for,
      pinterest_board_id,
      pinterest_title,
      pinterest_description,
      pinterest_link,
      threads_mode,
      thread_posts,
      threads_thread_media,
      instagram_as_story,
      instagram_as_reel,
      facebook_as_story,
      facebook_as_reel,
      youtube_as_short
    } = body;

    // Check if this is a Pinterest-only post with media
    const isPinterestOnlyWithMedia = platforms?.length === 1 &&
                                     platforms[0] === 'pinterest' &&
                                     pinterest_board_id &&
                                     media_urls?.length > 0;

    // Check if this is a Threads thread mode post
    const isThreadsThreadMode = platforms?.length === 1 &&
                                platforms[0] === 'threads' &&
                                threads_mode === 'thread' &&
                                thread_posts && thread_posts.length > 0;

    // Check if this is a Facebook post with media
    const isFacebookOnlyWithMedia = platforms?.length === 1 &&
                                    platforms[0] === 'facebook' &&
                                    media_urls?.length > 0;

    // Check if this is an Instagram Story with media
    const isInstagramStoryWithMedia = platforms?.length === 1 &&
                                      platforms[0] === 'instagram' &&
                                      instagram_as_story &&
                                      media_urls?.length > 0;

    // Validate required fields - allow empty content for Pinterest, Threads threads, Facebook, or Instagram Stories with media
    if ((!content && !isPinterestOnlyWithMedia && !isThreadsThreadMode && !isFacebookOnlyWithMedia && !isInstagramStoryWithMedia) || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Content and at least one platform are required' },
        { status: 400 }
      );
    }

    // Validate scheduled time (must be in the future)
    if (scheduled_for) {
      const scheduledDate = new Date(scheduled_for);
      const now = new Date();

      // Allow 5 minute tolerance for rescheduling
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (scheduledDate < fiveMinutesAgo) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
    }

    // Build update object - only include provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (content !== undefined) updateData.content = content;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (platform_content !== undefined) updateData.platform_content = platform_content || null;
    if (media_urls !== undefined) updateData.media_urls = media_urls || [];
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;

    // Pinterest fields
    if (pinterest_board_id !== undefined) updateData.pinterest_board_id = pinterest_board_id;
    if (pinterest_title !== undefined) updateData.pinterest_title = pinterest_title;
    if (pinterest_description !== undefined) updateData.pinterest_description = pinterest_description;
    if (pinterest_link !== undefined) updateData.pinterest_link = pinterest_link;

    // Threads fields
    if (threads_mode !== undefined) updateData.threads_mode = threads_mode;
    if (thread_posts !== undefined) updateData.thread_posts = thread_posts;
    if (threads_thread_media !== undefined) updateData.threads_thread_media = threads_thread_media;

    // Format flags
    if (instagram_as_story !== undefined) updateData.instagram_as_story = instagram_as_story;
    if (instagram_as_reel !== undefined) updateData.instagram_as_reel = instagram_as_reel;
    if (facebook_as_story !== undefined) updateData.facebook_as_story = facebook_as_story;
    if (facebook_as_reel !== undefined) updateData.facebook_as_reel = facebook_as_reel;
    if (youtube_as_short !== undefined) updateData.youtube_as_short = youtube_as_short;

    // Update the scheduled post
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this post
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scheduled post:', updateError);
      return NextResponse.json(
        { error: 'Failed to update scheduled post' },
        { status: 500 }
      );
    }

    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Scheduled post not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Scheduled post updated successfully'
    });
  } catch (error) {
    console.error('Error in PATCH /api/posts/scheduled/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/scheduled/[id] - Delete a scheduled post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the scheduled post
    const { error: deleteError } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting scheduled post:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete scheduled post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/posts/scheduled/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
