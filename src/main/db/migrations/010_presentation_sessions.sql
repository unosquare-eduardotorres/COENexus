CREATE TABLE IF NOT EXISTS presentation_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'manual',
  intro_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  open_position_id INTEGER,
  position_title TEXT,
  account_name TEXT,
  position_upstream_id INTEGER,
  job_description TEXT,
  generated_html TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_presentation_sessions_created
  ON presentation_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presentation_sessions_open_position
  ON presentation_sessions(open_position_id);

CREATE TABLE IF NOT EXISTS presentation_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES presentation_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT '',
  upstream_id INTEGER NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  years_of_experience TEXT,
  availability TEXT,
  recommended_rate TEXT,
  tech_stack_json TEXT,
  professional_summary TEXT,
  domain_experience TEXT,
  resume_format_status TEXT,
  transform_session_id INTEGER,
  individual_intro_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id, source_type, upstream_id)
);

CREATE INDEX IF NOT EXISTS idx_presentation_entries_session
  ON presentation_entries(session_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presentation_entries_transform_session
  ON presentation_entries(transform_session_id);