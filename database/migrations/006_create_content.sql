-- database/migrations/006_create_content.sql

CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content_type VARCHAR(50) NOT NULL,
    topic VARCHAR(255),
    target_audience VARCHAR(100),
    content_preview TEXT,
    results JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'generated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_topic ON content(topic);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);

-- RLS and policy
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS content_policy ON content
    FOR ALL
    USING (auth.uid() = user_id);

