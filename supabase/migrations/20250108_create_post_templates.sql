-- Create post templates table
CREATE TABLE IF NOT EXISTS post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  platforms JSONB NOT NULL DEFAULT '[]',
  platform_content JSONB DEFAULT '{}',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_post_templates_user_id ON post_templates(user_id);
CREATE INDEX idx_post_templates_category ON post_templates(category);
CREATE INDEX idx_post_templates_is_public ON post_templates(is_public);

-- Enable RLS
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own templates" ON post_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" ON post_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON post_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON post_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE post_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;