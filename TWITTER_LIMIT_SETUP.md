# Twitter Daily Limit Setup Instructions

## The Problem
The Twitter daily limit (2 posts per user per day) is not working because the database function hasn't been created in your Supabase production database.

## Solution

### Step 1: Run the Database Migration

Go to your Supabase Dashboard and run this SQL in the SQL Editor:

```sql
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
```

### Step 2: Add Environment Variable to Vercel

Add this to your Vercel environment variables:
```
TWITTER_USER_DAILY_LIMIT=2
```

### Step 3: Redeploy

After adding the environment variable, trigger a new deployment on Vercel.

## How It Works

The system now:
1. **Counts both posted and scheduled tweets** for each user per day
2. **Blocks scheduling** if user already has 2 or more Twitter posts for that day
3. **Shows friendly error message** when limit is reached
4. **Falls back to manual counting** if the database function doesn't exist (added as safety net)

## Testing

To test if it's working:
1. Try scheduling 3 Twitter posts for the same day
2. The 3rd post should be blocked with an error message
3. Check the browser console or Vercel logs for confirmation messages

## Current Implementation

- **Limit:** 2 Twitter posts per user per day (configurable)
- **Applies to:** Both immediate posts and scheduled posts
- **Error message:** "You've already scheduled X Twitter posts for [date]. To conserve API resources, we currently limit posts to 2 per day per user."