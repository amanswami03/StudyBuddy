-- Points & Ranking System Tables

-- User Points Ledger (Tracks all point transactions)
CREATE TABLE IF NOT EXISTS user_points_ledger (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Ranks (Current rank, total points, streak info)
CREATE TABLE IF NOT EXISTS user_ranks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_rank VARCHAR(50) DEFAULT 'Beginner',
    daily_message_count INTEGER DEFAULT 0,
    daily_message_points_used INTEGER DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    last_rank_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Message Reactions (For tracking helpful marks and reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    reactor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, reactor_user_id, reaction_type)
);

-- Daily Activity Log (For spam prevention and cron job tracking)
CREATE TABLE IF NOT EXISTS daily_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE DEFAULT CURRENT_DATE,
    message_count INTEGER DEFAULT 0,
    messages_with_reactions INTEGER DEFAULT 0,
    groups_joined INTEGER DEFAULT 0,
    resources_shared INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Rank Thresholds (Configurable rank requirements)
CREATE TABLE IF NOT EXISTS rank_thresholds (
    id SERIAL PRIMARY KEY,
    rank_name VARCHAR(50) UNIQUE NOT NULL,
    points_required INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    badge_emoji VARCHAR(10)
);

-- Insert default rank thresholds
INSERT INTO rank_thresholds (rank_name, points_required, display_order, badge_emoji) VALUES
    ('Beginner', 0, 1, '🌱'),
    ('Active', 100, 2, '⚡'),
    ('Contributor', 300, 3, '🎯'),
    ('Mentor', 700, 4, '🧠'),
    ('Elite Member', 1500, 5, '👑'),
    ('Legend', 3000, 6, '🔥')
ON CONFLICT (rank_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_user_date ON user_points_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ranks_total_points ON user_ranks(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON daily_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
