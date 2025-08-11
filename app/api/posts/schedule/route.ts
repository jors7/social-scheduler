import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    
    const { content, platforms, platformContent, mediaUrls, scheduledFor } = body;

    // Validate inputs
    if (!content || !platforms || platforms.length === 0 || !scheduledFor) {
      console.log('Validation failed:', {
        hasContent: !!content,
        hasPlatforms: !!platforms,
        platformsLength: platforms?.length,
        hasScheduledFor: !!scheduledFor
      });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: {
          content: !content ? 'Content is required' : 'OK',
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

    // Save to database WITHOUT .select() to avoid type casting issue
    // Build insert object conditionally to avoid trigger issues
    const insertData: any = {
      user_id: user.id,
      content,
      platforms: platforms, // Keep as array - Supabase should handle JSONB conversion
      platform_content: platformContent || {},
      scheduled_for: scheduledFor,
      status: 'pending'
    };
    
    // Set media_urls to empty array if not provided to avoid null issues
    // This ensures the JSONB field always has a valid array value
    insertData.media_urls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : [];
    
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
    const { postId, scheduledFor, status, content, platforms, platformContent, mediaUrls } = body;

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