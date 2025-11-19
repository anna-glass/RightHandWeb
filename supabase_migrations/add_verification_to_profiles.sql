-- Add verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(12);

-- Create unique index on verification_token for faster lookups and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_verification_token ON profiles(verification_token);

-- Create index on verified for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
