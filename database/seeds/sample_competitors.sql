-- database/seeds/sample_competitors.sql

INSERT INTO competitors (id, user_id, name, website, description, industry, status)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'TechCrunch', 'https://techcrunch.com', 'Leading technology media platform', 'technology', 'active'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Mashable', 'https://mashable.com', 'Digital media and technology news', 'technology', 'active'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Forbes', 'https://forbes.com', 'Business and finance publication', 'business', 'pending'),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Entrepreneur', 'https://entrepreneur.com', 'Entrepreneurship and business content', 'business', 'pending')
ON CONFLICT (id) DO NOTHING;

