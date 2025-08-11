-- Create a function to update scheduled post time
-- This avoids the JSONB type casting issue

CREATE OR REPLACE FUNCTION update_scheduled_post_time(
  post_id UUID,
  new_scheduled_for TIMESTAMP WITH TIME ZONE,
  user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  updated_post JSON;
BEGIN
  -- Update the post and return it as JSON
  UPDATE scheduled_posts
  SET 
    scheduled_for = new_scheduled_for,
    updated_at = NOW()
  WHERE 
    id = post_id 
    AND user_id = user_id_param
  RETURNING row_to_json(scheduled_posts.*) INTO updated_post;
  
  IF updated_post IS NULL THEN
    RAISE EXCEPTION 'Post not found or unauthorized';
  END IF;
  
  RETURN updated_post;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_scheduled_post_time TO authenticated;