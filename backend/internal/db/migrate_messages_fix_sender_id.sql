-- Repair the messages table for the newer code paths that expect sender_id + sender_name + message_type.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

-- Keep compatibility with older tables that stored group_id as text.
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

-- Add foreign key constraint if sender_id was just added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'messages' 
    AND constraint_name LIKE '%sender_id%'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT fk_messages_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
