-- database/policies/user_policies.sql

-- USERS table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS users_insert_self ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS users_update_own ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS users_delete_own ON users
  FOR DELETE USING (auth.uid() = id);

-- CONTENT table policies (user-owned)
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS content_select_own ON content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS content_insert_own ON content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS content_update_own ON content
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS content_delete_own ON content
  FOR DELETE USING (auth.uid() = user_id);

-- ANALYSES table policies (user-owned)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS analyses_select_own ON analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS analyses_insert_own ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS analyses_update_own ON analyses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS analyses_delete_own ON analyses
  FOR DELETE USING (auth.uid() = user_id);

-- INTEGRATIONS table policies (user-owned)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS integrations_select_own ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS integrations_insert_own ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS integrations_update_own ON integrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS integrations_delete_own ON integrations
  FOR DELETE USING (auth.uid() = user_id);

