-- database/migrations/004_create_assets.sql

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    description TEXT,
    tags TEXT[],
    source_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- RLS and policy
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS assets_policy ON assets
    FOR ALL
    USING (auth.uid() = user_id);

