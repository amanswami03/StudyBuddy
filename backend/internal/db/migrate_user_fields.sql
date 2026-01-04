-- Add location, university, and major columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS university TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS major TEXT DEFAULT '';
