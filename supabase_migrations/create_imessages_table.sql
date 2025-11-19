-- Create imessages table for storing Blooio webhook messages
CREATE TABLE IF NOT EXISTS imessages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  sender VARCHAR(255) NOT NULL, -- external_id from webhook (phone number)
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  protocol VARCHAR(50),
  timestamp BIGINT, -- Unix timestamp in milliseconds
  device_id VARCHAR(255),
  received_at BIGINT, -- Unix timestamp in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_imessages_message_id ON imessages(message_id);

-- Create index on sender for filtering by sender
CREATE INDEX IF NOT EXISTS idx_imessages_sender ON imessages(sender);

-- Create index on created_at for sorting by time
CREATE INDEX IF NOT EXISTS idx_imessages_created_at ON imessages(created_at DESC);

-- Create index on event for filtering by event type
CREATE INDEX IF NOT EXISTS idx_imessages_event ON imessages(event);

-- Enable Row Level Security
ALTER TABLE imessages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert (for webhook)
CREATE POLICY "Allow service role to insert messages"
  ON imessages
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create policy to allow authenticated @getrighthand.com users to read all messages
CREATE POLICY "Allow getrighthand.com users to read messages"
  ON imessages
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email')::text LIKE '%@getrighthand.com'
  );

-- Grant necessary permissions
GRANT ALL ON imessages TO service_role;
GRANT SELECT ON imessages TO authenticated;
