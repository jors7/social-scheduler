import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET - Fetch all drafts for the current user
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

    // Fetch drafts
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[API GET] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      drafts: data || []
    });

  } catch (error) {
    console.error('Get drafts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

// POST - Create a new draft
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
    const { title, content, platforms, platformContent, media_urls, pinterest_title, pinterest_description } = body;

    // Validate inputs
    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Generate a title if not provided
    const draftTitle = title || `Draft - ${new Date().toLocaleDateString()}`;

    // Save draft
    const insertData: any = {
      user_id: user.id,
      title: draftTitle,
      content,
      platforms,
      platform_content: platformContent || {},
      media_urls: media_urls || []
    };

    // Add Pinterest fields if provided
    if (pinterest_title) {
      insertData.pinterest_title = pinterest_title;
    }
    if (pinterest_description) {
      insertData.pinterest_description = pinterest_description;
    }

    const { data, error } = await supabase
      .from('drafts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[API POST] Database error:', error);
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      draft: data
    });

  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing draft
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
    const { draftId, title, content, platforms, platformContent, media_urls, pinterest_title, pinterest_description } = body;

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // Build update data
    const updateData: any = {
      title,
      content,
      platforms,
      platform_content: platformContent,
      media_urls: media_urls
    };

    // Add Pinterest fields if provided
    if (pinterest_title !== undefined) {
      updateData.pinterest_title = pinterest_title;
    }
    if (pinterest_description !== undefined) {
      updateData.pinterest_description = pinterest_description;
    }

    // Update draft
    const { data, error } = await supabase
      .from('drafts')
      .update(updateData)
      .eq('id', draftId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      draft: data 
    });

  } catch (error) {
    console.error('Update draft error:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a draft
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
    const draftId = searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // Delete draft
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Draft deleted successfully' 
    });

  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    );
  }
}