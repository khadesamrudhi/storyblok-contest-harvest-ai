-- database/migrations/007_create_analyses.sql

CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES trends(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    content_title VARCHAR(500),
    content_type VARCHAR(50),
    content_preview TEXT,
    results JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_competitor_id ON analyses(competitor_id);
CREATE INDEX IF NOT EXISTS idx_analyses_trend_id ON analyses(trend_id);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(type);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);

-- RLS and policy
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS analyses_policy ON analyses
    FOR ALL
    USING (auth.uid() = user_id);

