-- Add profile_id to imessages table to link messages to profiles
-- Nullable because messages might come from users who haven't created profiles yet

-- First, let's check what type profiles.id is
-- Assuming it's UUID (standard Supabase pattern)

ALTER TABLE imessages
ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster joins and filtering
CREATE INDEX idx_imessages_profile_id ON imessages(profile_id);

-- No trigger needed - profile linking will be handled in the webhook
