# IMPORTANT: Database Fix Required

## Issue
The scheduling and rescheduling of posts is failing due to a database trigger error:
- Error: `cannot cast type jsonb to text[]`
- Cause: The `update_media_usage()` trigger in the media_library migration is trying to cast JSONB fields to text[] incorrectly

## Solution
Run the following SQL in your Supabase SQL Editor to fix the trigger:

```sql
-- Fix the media usage trigger to handle JSONB properly
-- The issue is that media_urls is JSONB, not text[]

-- First, drop the existing triggers
DROP TRIGGER IF EXISTS update_media_usage_scheduled ON scheduled_posts;
DROP TRIGGER IF EXISTS update_media_usage_drafts ON drafts;

-- Create a fixed version of the function
CREATE OR REPLACE FUNCTION update_media_usage()
RETURNS TRIGGER AS $$
DECLARE
  url_array TEXT[];
BEGIN
  -- Update media usage count when a post is created/deleted
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Convert JSONB array to text array
    IF NEW.media_urls IS NOT NULL AND jsonb_typeof(NEW.media_urls) = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.media_urls)) INTO url_array;
      
      -- Update usage count for all media URLs in the post
      UPDATE media_library
      SET 
        used_in_posts = used_in_posts + 1,
        last_used_at = NOW()
      WHERE url = ANY(url_array)
      AND user_id = NEW.user_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    -- Decrease usage count for removed media
    IF OLD.media_urls IS NOT NULL AND jsonb_typeof(OLD.media_urls) = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(OLD.media_urls)) INTO url_array;
      
      UPDATE media_library
      SET used_in_posts = GREATEST(0, used_in_posts - 1)
      WHERE url = ANY(url_array)
      AND user_id = OLD.user_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with the fixed function
CREATE TRIGGER update_media_usage_scheduled
  AFTER INSERT OR UPDATE OR DELETE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_media_usage();

CREATE TRIGGER update_media_usage_drafts
  AFTER INSERT OR UPDATE OR DELETE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_media_usage();
```

## How to Apply
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL above
4. Click "Run" to execute the migration
5. Test scheduling a new post - it should work without errors

## Status
- ✅ Calendar drag-and-drop offset issue: **FIXED** (using native HTML5 drag-and-drop)
- ✅ Timezone/date offset issue: **FIXED** (using local date comparisons)
- ⚠️ Database trigger issue: **REQUIRES MANUAL FIX** (run the SQL above)

## API Workaround (Already Applied)
The API has been modified to always set `media_urls` as an empty array instead of null to avoid triggering the casting error. This is a temporary workaround until the database trigger is fixed.