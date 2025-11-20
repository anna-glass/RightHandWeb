-- Create table for tracking pending email drafts
CREATE TABLE IF NOT EXISTS pending_email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gmail_draft_id text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_pending_drafts_user_id ON pending_email_drafts(user_id);

-- Create index for finding most recent drafts
CREATE INDEX IF NOT EXISTS idx_pending_drafts_created_at ON pending_email_drafts(user_id, created_at DESC);

-- Add RLS policies
ALTER TABLE pending_email_drafts ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own drafts
CREATE POLICY "Users can manage their own drafts"
  ON pending_email_drafts
  FOR ALL
  USING (auth.uid() = user_id);

-- Allow service role to manage all drafts (for the API)
CREATE POLICY "Service role can manage all drafts"
  ON pending_email_drafts
  FOR ALL
  TO service_role
  USING (true);
