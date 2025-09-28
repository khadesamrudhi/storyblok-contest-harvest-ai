-- database/migrations/003_create_scraping_jobs.sql

CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    target_url TEXT NOT NULL,
    results JSONB,
    error_message TEXT,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_competitor_id ON scraping_jobs(competitor_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type ON scraping_jobs(type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_priority ON scraping_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- RLS and policy
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS scraping_jobs_policy ON scraping_jobs
    FOR ALL
    USING (auth.uid() = user_id);

