-- Add type column to digests table to support recurring reminders
-- 'digest' = AI-generated summary (existing behavior)
-- 'recurring_reminder' = static message sent on schedule

ALTER TABLE digests
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'digest'
CHECK (type IN ('digest', 'recurring_reminder'));

-- Allow nullable qstash_schedule_id (we set it after creation)
ALTER TABLE digests
ALTER COLUMN qstash_schedule_id DROP NOT NULL;
