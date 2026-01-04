-- Add require_admin_approval column to groups table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='require_admin_approval') THEN
        ALTER TABLE groups ADD COLUMN require_admin_approval BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create join_requests table to track pending join requests
CREATE TABLE IF NOT EXISTS join_requests (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    UNIQUE(group_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_join_requests_group_id ON join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_group_status ON join_requests(group_id, status);
