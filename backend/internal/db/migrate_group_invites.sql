-- Add invite_code column to groups table for unique invite links
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12);

-- Create extension for uuid generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update existing rows with generated unique codes
UPDATE groups SET invite_code = substr(to_hex((random()*9223372036854775807)::bigint), 1, 12) WHERE invite_code IS NULL;

-- Drop existing unique constraint if it exists (from previous failed attempt)
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_invite_code_unique;

-- Drop existing unique index if it exists
DROP INDEX IF EXISTS idx_groups_invite_code_key CASCADE;

-- Add unique constraint on invite_code
DO $$
BEGIN
  ALTER TABLE groups ADD CONSTRAINT groups_invite_code_unique UNIQUE (invite_code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
