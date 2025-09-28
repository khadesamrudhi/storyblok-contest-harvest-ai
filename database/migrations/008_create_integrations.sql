-- database/migrations/008_create_integrations.sql

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- RLS and policy
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS integrations_policy ON integrations
    FOR ALL
    USING (auth.uid() = user_id);

