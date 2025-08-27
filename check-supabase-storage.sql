-- Check if post-media bucket exists and is public
SELECT 
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets
WHERE name = 'post-media';

-- Check RLS policies for the bucket
SELECT 
  name,
  definition,
  check_expression
FROM storage.policies
WHERE bucket_id = 'post-media';