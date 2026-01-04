-- Create scheduled_group_sessions table to track scheduled study sessions for groups
CREATE TABLE IF NOT EXISTS scheduled_group_sessions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_attendees INTEGER,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'voting', 'confirmed', 'cancelled', 'completed'
    voting_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, title)
);

-- Create table for voting options on scheduled sessions
CREATE TABLE IF NOT EXISTS session_voting_options (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES scheduled_group_sessions(id) ON DELETE CASCADE,
    option_time TIMESTAMP NOT NULL,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table for user votes on session times
CREATE TABLE IF NOT EXISTS session_user_votes (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES scheduled_group_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voting_option_id INTEGER NOT NULL REFERENCES session_voting_options(id) ON DELETE CASCADE,
    voted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, user_id) -- One vote per user per session
);

-- Create table for session attendees
CREATE TABLE IF NOT EXISTS session_attendees (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES scheduled_group_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'interested', -- 'interested', 'attending', 'declined'
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_group_sessions_group_id ON scheduled_group_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_group_sessions_created_by ON scheduled_group_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_group_sessions_status ON scheduled_group_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_voting_options_session_id ON session_voting_options(session_id);
CREATE INDEX IF NOT EXISTS idx_session_user_votes_session_id ON session_user_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendees_session_id ON session_attendees(session_id);
