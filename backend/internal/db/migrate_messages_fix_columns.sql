-- Add legacy and current columns required by the chat code.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

UPDATE messages
SET sender = sender_name
WHERE sender IS NULL AND sender_name IS NOT NULL;

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
