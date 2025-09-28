-- database/policies/asset_policies.sql

-- ASSETS table policies (user-owned)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS assets_select_own ON assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS assets_insert_own ON assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS assets_update_own ON assets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS assets_delete_own ON assets
  FOR DELETE USING (auth.uid() = user_id);

-- TRENDS table: read-only to everyone, inserts restricted to authenticated users (optional)
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS trends_select_all ON trends
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS trends_insert_auth ON trends
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

