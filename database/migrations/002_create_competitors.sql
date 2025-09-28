-- database/migrations/002_create_competitors.sql

CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    website TEXT NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    last_scraped TIMESTAMP WITH TIME ZONE,
    scraping_frequency VARCHAR(20) DEFAULT 'weekly',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_website ON competitors(website);
CREATE INDEX IF NOT EXISTS idx_competitors_status ON competitors(status);
CREATE INDEX IF NOT EXISTS idx_competitors_last_scraped ON competitors(last_scraped);

-- RLS and policy
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS competitors_policy ON competitors
    FOR ALL
    USING (auth.uid() = user_id);

