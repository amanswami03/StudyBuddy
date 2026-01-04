-- Update groups table to add username and permissions (with conditionals to avoid conflicts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='username') THEN
        ALTER TABLE groups ADD COLUMN username TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='is_public') THEN
        ALTER TABLE groups ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='allow_content_view_without_join') THEN
        ALTER TABLE groups ADD COLUMN allow_content_view_without_join BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='groups' AND column_name='updated_at') THEN
        ALTER TABLE groups ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Update group_members to track role and join status (with conditionals)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_members' AND column_name='role') THEN
        ALTER TABLE group_members ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='group_members' AND column_name='joined_at') THEN
        ALTER TABLE group_members ADD COLUMN joined_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create a table for group member removal logs (for audit)
CREATE TABLE IF NOT EXISTS group_member_history (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'joined', 'left', 'removed', 'admin_granted', 'admin_revoked'
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create an index for faster group searches
CREATE INDEX IF NOT EXISTS idx_groups_username ON groups(username);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
