-- Create function to count user's Twitter posts for a specific date
CREATE OR REPLACE FUNCTION count_user_twitter_posts(
  user_uuid UUID,
  check_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  posted_count INTEGER;
  scheduled_count INTEGER;
BEGIN
  -- Count already posted tweets for this user on this date
  SELECT COUNT(*)
  INTO posted_count
  FROM twitter_usage
  WHERE user_id = user_uuid
    AND DATE(created_at AT TIME ZONE 'UTC') = check_date;

  -- Count scheduled tweets for this user on this date (pending status only)
  SELECT COUNT(*)
  INTO scheduled_count
  FROM scheduled_posts
  WHERE user_id = user_uuid
    AND status = 'pending'
    AND DATE(scheduled_for AT TIME ZONE 'UTC') = check_date
    AND (platforms ? 'twitter' OR platforms ? 'x');

  RETURN COALESCE(posted_count, 0) + COALESCE(scheduled_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_user_twitter_posts TO authenticated;