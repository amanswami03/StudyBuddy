-- Add sender_id column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER;

-- Add foreign key constraint if sender_id was just added
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
