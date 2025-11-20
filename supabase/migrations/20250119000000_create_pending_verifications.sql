-- Create pending_verifications table
CREATE TABLE IF NOT EXISTS pending_verifications (
  verification_token TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on phone_number for lookups
CREATE INDEX IF NOT EXISTS idx_pending_verifications_phone ON pending_verifications(phone_number);

-- Add RLS policies
ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pending verifications (needed for verification flow)
CREATE POLICY "Allow public read access to pending verifications"
  ON pending_verifications
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
