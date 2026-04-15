CREATE TABLE IF NOT EXISTS vigil_activity_log (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('run_started', 'run_progress', 'run_completed', 'run_failed', 'chat', 'system')),
  source TEXT NOT NULL CHECK (source IN ('employees', 'candidates', 'open-positions', 'project-reallocations', 'system')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES vigil_runs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vigil_runs (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  sources_json TEXT NOT NULL,
  results_json TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  token_hash TEXT
);

CREATE TABLE IF NOT EXISTS vigil_chat_messages (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vigil_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schedule_enabled INTEGER NOT NULL DEFAULT 0 CHECK (schedule_enabled IN (0, 1)),
  schedule_hour INTEGER NOT NULL DEFAULT 19 CHECK (schedule_hour BETWEEN 0 AND 23),
  schedule_minute INTEGER NOT NULL DEFAULT 0 CHECK (schedule_minute BETWEEN 0 AND 59),
  sync_sources_json TEXT NOT NULL DEFAULT '["employees","candidates","open-positions","project-reallocations"]',
  candidate_year_filter INTEGER NOT NULL DEFAULT 2026
);

INSERT OR IGNORE INTO vigil_config (id) VALUES (1);

CREATE INDEX IF NOT EXISTS idx_vigil_runs_status_started
  ON vigil_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_runs_trigger_started
  ON vigil_runs(trigger_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_runs_completed
  ON vigil_runs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_activity_log_run_created
  ON vigil_activity_log(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_activity_log_source_created
  ON vigil_activity_log(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_activity_log_severity_created
  ON vigil_activity_log(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigil_chat_messages_created
  ON vigil_chat_messages(created_at DESC);
