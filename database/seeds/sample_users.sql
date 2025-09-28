-- database/seeds/sample_users.sql

INSERT INTO users (id, name, email, password, plan, subscription_status, email_verified)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'john@example.com', '$2b$12$examplehashjohn', 'pro', 'active', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'jane@example.com', '$2b$12$examplehashjane', 'free', 'active', false),
  ('550e8400-e29b-41d4-a716-446655440003', 'Bob Johnson', 'bob@example.com', '$2b$12$examplehashbob', 'pro', 'active', true)
ON CONFLICT (email) DO NOTHING;

