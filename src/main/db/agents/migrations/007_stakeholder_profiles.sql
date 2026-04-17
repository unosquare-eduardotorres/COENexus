CREATE TABLE IF NOT EXISTS stakeholder_profiles (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  stakeholder_name TEXT NOT NULL,
  account TEXT NOT NULL,
  observed_rate_floor REAL,
  observed_rate_ceiling REAL,
  avg_accepted_rate REAL,
  accepted_countries TEXT NOT NULL DEFAULT '[]',
  rejected_countries TEXT NOT NULL DEFAULT '[]',
  untested_countries TEXT NOT NULL DEFAULT '[]',
  seniority_flexibility INTEGER NOT NULL DEFAULT 0,
  posted_seniorities TEXT NOT NULL DEFAULT '[]',
  accepted_seniorities TEXT NOT NULL DEFAULT '[]',
  avg_time_to_decision_days REAL,
  top_rejection_reasons TEXT NOT NULL DEFAULT '[]',
  top_acceptance_signals TEXT NOT NULL DEFAULT '[]',
  preference_summary TEXT NOT NULL DEFAULT '',
  data_points_count INTEGER NOT NULL DEFAULT 0,
  confidence_score REAL NOT NULL DEFAULT 0,
  last_inference_job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (stakeholder_name, account),
  FOREIGN KEY (last_inference_job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_profiles_account
  ON stakeholder_profiles(account);
CREATE INDEX IF NOT EXISTS idx_stakeholder_profiles_stakeholder_account
  ON stakeholder_profiles(stakeholder_name, account);
