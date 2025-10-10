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
      scheduled_for
    } = body;

    // Validate required fields
    if (!content || !platforms || platforms.length === 0) {
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

    // Update the scheduled post
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        content,
        platforms,
        platform_content: platform_content || null,
        media_urls: media_urls || [],
        scheduled_for,
        updated_at: new Date().toISOString()
      })
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
