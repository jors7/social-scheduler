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

    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid urls provided' }, { status: 400 });
    }

    const deletedFiles = [];
    const errors = [];

    for (const url of urls) {
      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/post-media/user-id/timestamp-random.ext
        const urlParts = url.split('/storage/v1/object/public/post-media/');
        if (urlParts.length !== 2) {
          errors.push({ url, error: 'Invalid URL format' });
          continue;
        }

        const filePath = urlParts[1];
        
        // Verify the file belongs to the current user
        if (!filePath.startsWith(user.id)) {
          errors.push({ url, error: 'Unauthorized to delete this file' });
          continue;
        }

        // Delete the file from storage
        const { error } = await supabase.storage
          .from('post-media')
          .remove([filePath]);

        if (error) {
          errors.push({ url, error: error.message });
        } else {
          deletedFiles.push(filePath);
        }
      } catch (error) {
        errors.push({ 
          url, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Cleanup endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup files' },
      { status: 500 }
    );
  }
}