-- Add bio column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
