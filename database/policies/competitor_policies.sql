-- database/policies/competitor_policies.sql

-- COMPETITORS table policies (user-owned)
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS competitors_select_own ON competitors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS competitors_insert_own ON competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS competitors_update_own ON competitors
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS competitors_delete_own ON competitors
  FOR DELETE USING (auth.uid() = user_id);

-- SCRAPING_JOBS table policies (user-owned)
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS scraping_jobs_select_own ON scraping_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS scraping_jobs_insert_own ON scraping_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS scraping_jobs_update_own ON scraping_jobs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS scraping_jobs_delete_own ON scraping_jobs
  FOR DELETE USING (auth.uid() = user_id);

