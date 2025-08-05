-- Storage bucket policies for post-media
-- Run this AFTER creating the bucket in the Supabase dashboard

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow everyone to view files (since it's a public bucket)
CREATE POLICY "Public can view all media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'post-media');