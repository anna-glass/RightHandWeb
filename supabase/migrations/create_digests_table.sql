-- Create digests table for scheduled user digests
CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,

  -- What the digest should contain
  prompt TEXT NOT NULL, -- e.g., "Show me all of my events today"

  -- Qstash schedule ID
  qstash_schedule_id TEXT NOT NULL,

  -- User timezone (stored for reference)
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',

  -- When to send (stored in user's timezone)
  send_hour INTEGER NOT NULL CHECK (send_hour >= 0 AND send_hour < 24),
  send_minute INTEGER NOT NULL DEFAULT 0 CHECK (send_minute >= 0 AND send_minute < 60),

  -- Frequency
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'weekdays')),

  -- For weekly digests, day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week < 7)),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_digests_user_id ON digests(user_id);
CREATE INDEX IF NOT EXISTS idx_digests_active ON digests(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

-- Users can view their own digests
CREATE POLICY "Users can view own digests"
  ON digests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own digests
CREATE POLICY "Users can insert own digests"
  ON digests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own digests
CREATE POLICY "Users can update own digests"
  ON digests FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own digests
CREATE POLICY "Users can delete own digests"
  ON digests FOR DELETE
  USING (auth.uid() = user_id);
