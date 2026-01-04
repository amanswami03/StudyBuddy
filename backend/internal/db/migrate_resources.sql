-- Create shared resources table for group file sharing
CREATE TABLE IF NOT EXISTS group_resources (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_group_resources_group_id ON group_resources(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resources_uploaded_by ON group_resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_group_resources_created_at ON group_resources(created_at);
