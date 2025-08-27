-- Create YouTube uploads table
CREATE TABLE IF NOT EXISTS youtube_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  status TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE youtube_uploads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own uploads
CREATE POLICY "Users can view own YouTube uploads"
  ON youtube_uploads FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert own YouTube uploads"
  ON youtube_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own uploads
CREATE POLICY "Users can update own YouTube uploads"
  ON youtube_uploads FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own YouTube uploads"
  ON youtube_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_youtube_uploads_user_id ON youtube_uploads(user_id);
CREATE INDEX idx_youtube_uploads_video_id ON youtube_uploads(video_id);
CREATE INDEX idx_youtube_uploads_uploaded_at ON youtube_uploads(uploaded_at DESC);