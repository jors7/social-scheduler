-- Create a function to safely insert scheduled posts
-- This bypasses any type casting issues with JSONB columns

CREATE OR REPLACE FUNCTION insert_scheduled_post(
  p_user_id UUID,
  p_content TEXT,
  p_platforms JSONB,
  p_platform_content JSONB,
  p_media_urls JSONB,
  p_scheduled_for TIMESTAMP WITH TIME ZONE,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  new_post_id UUID;
BEGIN
  INSERT INTO scheduled_posts (
    user_id,
    content,
    platforms,
    platform_content,
    media_urls,
    scheduled_for,
    status
  ) VALUES (
    p_user_id,
    p_content,
    p_platforms,
    p_platform_content,
    p_media_urls,
    p_scheduled_for,
    p_status
  ) RETURNING id INTO new_post_id;
  
  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_scheduled_post TO authenticated;

-- Similarly for updates
CREATE OR REPLACE FUNCTION update_scheduled_post_time_safe(
  p_post_id UUID,
  p_user_id UUID,
  p_scheduled_for TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scheduled_posts
  SET 
    scheduled_for = p_scheduled_for,
    updated_at = NOW()
  WHERE 
    id = p_post_id 
    AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_scheduled_post_time_safe TO authenticated;