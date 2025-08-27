import { createBrowserClient } from '@supabase/ssr';

export async function uploadDirectToSupabase(
  file: File,
  userId: string
): Promise<string | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${timestamp}-${randomString}.${fileExt}`;

    // Upload directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Direct upload error:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

export async function uploadMultipleFiles(
  files: File[],
  userId: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const url = await uploadDirectToSupabase(files[i], userId);
    if (url) {
      urls.push(url);
    }
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  
  return urls;
}