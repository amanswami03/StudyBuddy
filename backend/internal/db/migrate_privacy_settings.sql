-- Add privacy settings columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_university BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_bio BOOLEAN DEFAULT false;
