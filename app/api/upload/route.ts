import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { r2Storage } from '@/lib/r2/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for large uploads

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

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-flv', 'video/x-matroska'];
      const isImage = validImageTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        continue; // Skip invalid file types
      }

      // Check file size limits
      const maxImageSize = 50 * 1024 * 1024; // 50MB for images
      const maxVideoSize = 500 * 1024 * 1024; // 500MB for videos
      const maxSize = isVideo ? maxVideoSize : maxImageSize;

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds size limit (${isVideo ? '500MB' : '50MB'})` },
          { status: 400 }
        );
      }

      // Generate unique key for R2
      const key = r2Storage.generateKey(user.id, file.name);

      try {
        // Upload to R2
        const uploadResult = await r2Storage.upload(file, key, file.type);

        uploadedFiles.push({
          name: file.name,
          url: uploadResult.url,
          type: file.type,
          size: file.size
        });
      } catch (error) {
        console.error('R2 upload error:', error);
        continue; // Skip failed uploads
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files were uploaded successfully' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}