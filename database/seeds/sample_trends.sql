-- database/seeds/sample_trends.sql

INSERT INTO trends (keyword, category, trend_score, volume, growth_rate, source, related_queries)
VALUES
  ('artificial intelligence', 'technology', 95.5, 1000000, 15.2, 'google_trends', ARRAY['AI', 'machine learning', 'deep learning']),
  ('remote work', 'business', 87.3, 750000, 8.7, 'google_trends', ARRAY['work from home', 'digital nomad', 'virtual office']),
  ('sustainable fashion', 'fashion', 78.9, 250000, 12.4, 'twitter', ARRAY['eco fashion', 'green clothing', 'sustainable style']),
  ('cryptocurrency', 'finance', 92.1, 2000000, 5.3, 'google_trends', ARRAY['bitcoin', 'ethereum', 'blockchain']),
  ('mental health', 'health', 85.6, 500000, 9.8, 'twitter', ARRAY['wellness', 'mindfulness', 'therapy'])
ON CONFLICT DO NOTHING;
