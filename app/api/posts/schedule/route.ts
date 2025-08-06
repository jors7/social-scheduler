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

    // Save to database
    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        content,
        platforms,
        platform_content: platformContent || {},
        media_urls: mediaUrls || [],
        scheduled_for: scheduledFor,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      post: data 
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
    const { postId, scheduledFor, status, content, platforms, platformContent, mediaUrls } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {};
    if (scheduledFor !== undefined) {
      updateData.scheduled_for = scheduledFor;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (platforms !== undefined) {
      updateData.platforms = platforms;
    }
    if (platformContent !== undefined) {
      updateData.platform_content = platformContent || {};
    }
    if (mediaUrls !== undefined) {
      updateData.media_urls = mediaUrls || [];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    // Update the scheduled post
    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(updateData)
      .eq('id', postId)
      .eq('user_id', user.id) // Ensure user can only update their own posts
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ error: 'Failed to update scheduled post' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      post: data 
    });

  } catch (error) {
    console.error('PATCH scheduled posts error:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled post' },
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