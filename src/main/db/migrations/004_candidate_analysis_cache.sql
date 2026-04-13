-- Migration 004: Cache individual candidate analysis results for reuse across match sessions
-- Keyed by (candidate_upstream_id, source_type, jd_hash) so the same candidate matched
-- against the same job description text reuses the expensive AI deep-analysis result.

CREATE TABLE IF NOT EXISTS candidate_analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_upstream_id INTEGER NOT NULL,
  candidate_source_type TEXT NOT NULL,
  jd_hash TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(candidate_upstream_id, candidate_source_type, jd_hash)
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_lookup
  ON candidate_analysis_cache(candidate_upstream_id, candidate_source_type, jd_hash);
