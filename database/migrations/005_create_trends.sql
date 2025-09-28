-- database/migrations/005_create_trends.sql

CREATE TABLE IF NOT EXISTS trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    trend_score DECIMAL(10,2) DEFAULT 0,
    volume INTEGER DEFAULT 0,
    growth_rate DECIMAL(10,2) DEFAULT 0,
    source VARCHAR(50) NOT NULL,
    geographic_region VARCHAR(100),
    timeframe VARCHAR(20),
    related_queries TEXT[],
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends(keyword);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_trend_score ON trends(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_trends_source ON trends(source);
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON trends(created_at);
CREATE INDEX IF NOT EXISTS idx_trends_related_queries ON trends USING GIN(related_queries);

