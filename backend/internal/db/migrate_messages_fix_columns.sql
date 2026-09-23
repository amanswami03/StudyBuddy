-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'group_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE messages ALTER COLUMN group_id TYPE INTEGER USING group_id::INTEGER;
  END IF;
END $$;
