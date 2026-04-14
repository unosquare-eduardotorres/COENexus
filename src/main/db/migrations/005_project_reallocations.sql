CREATE TABLE IF NOT EXISTS synced_project_reallocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upstream_id INTEGER NOT NULL UNIQUE,
  employee TEXT NOT NULL DEFAULT '',
  account TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT '',
  transition_status TEXT NOT NULL DEFAULT '',
  transition_sub_type TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  request_date TEXT,
  days_since_last_interview TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT '',
  attrition_risk TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  presentations_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'synced',
  status_reason TEXT,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prr_presentations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prr_id INTEGER NOT NULL,
  open_position_id INTEGER NOT NULL,
  account TEXT NOT NULL DEFAULT '',
  open_position_status TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  presented_on TEXT,
  candidate_status TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL,
  UNIQUE(prr_id, open_position_id, presented_on)
);
CREATE INDEX IF NOT EXISTS idx_prr_presentations_prr_id ON prr_presentations(prr_id);
