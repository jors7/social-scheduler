-- Add metadata column to affiliates table for storing additional information
-- like suspension reasons, notes, etc.

ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries (optional but helpful for performance)
CREATE INDEX IF NOT EXISTS idx_affiliates_metadata ON public.affiliates USING gin(metadata);

-- Add comment for documentation
COMMENT ON COLUMN public.affiliates.metadata IS 'Stores additional information like suspension reasons, admin notes, etc.';
