-- Create index on phone_number for fast lookups in webhook
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
