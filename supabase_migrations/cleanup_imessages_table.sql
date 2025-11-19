-- Clean up imessages table
-- 1. Drop redundant timestamp columns
-- 2. Make message_id the primary key instead of id

-- Drop the old primary key and unique constraint
ALTER TABLE imessages DROP CONSTRAINT IF EXISTS imessages_pkey;
ALTER TABLE imessages DROP CONSTRAINT IF EXISTS imessages_message_id_key;

-- Drop the index on message_id (will be recreated automatically when we make it primary key)
DROP INDEX IF EXISTS idx_imessages_message_id;

-- Drop redundant columns
ALTER TABLE imessages DROP COLUMN IF EXISTS id;
ALTER TABLE imessages DROP COLUMN IF EXISTS timestamp;
ALTER TABLE imessages DROP COLUMN IF EXISTS received_at;

-- Make message_id the primary key
ALTER TABLE imessages ADD PRIMARY KEY (message_id);
