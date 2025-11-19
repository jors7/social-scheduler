-- Add processing_state column for two-phase processing
-- This stores intermediate state like Instagram container IDs

-- Add the processing_state column
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS processing_state JSONB;

-- Update the status check constraint to include 'processing'
-- First drop the existing constraint
ALTER TABLE scheduled_posts
DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

-- Add the new constraint with 'processing' status
ALTER TABLE scheduled_posts
ADD CONSTRAINT scheduled_posts_status_check
CHECK (status IN ('pending', 'posting', 'processing', 'posted', 'failed', 'cancelled'));

-- Add index for processing status queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_processing
ON scheduled_posts(status, updated_at)
WHERE status IN ('posting', 'processing');

-- Comment explaining the processing_state structure
COMMENT ON COLUMN scheduled_posts.processing_state IS 'Stores intermediate processing state. For Instagram carousels: {phase: "containers_created", container_ids: [...], carousel_container_id: "...", attempts: 0}';
