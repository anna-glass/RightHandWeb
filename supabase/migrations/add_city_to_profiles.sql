-- Add city column to profiles for location-based queries
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Optional: Add an index if you expect to query by city
-- CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
