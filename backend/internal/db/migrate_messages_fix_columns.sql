-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
