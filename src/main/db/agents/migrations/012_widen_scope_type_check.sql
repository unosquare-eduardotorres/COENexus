-- Widen scope_type CHECK to include 'account' and 'stakeholder' for Braniac agent
PRAGMA foreign_keys = OFF;

CREATE TABLE agent_jobs_new (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  scope_type TEXT NOT NULL DEFAULT 'org' CHECK (scope_type IN ('org', 'project', 'custom', 'account', 'stakeholder')),
  scope_value TEXT,
  initiated_by TEXT NOT NULL DEFAULT 'system',
  run_reason TEXT NOT NULL DEFAULT '',
  pipeline_phase TEXT NOT NULL DEFAULT 'idle',
  started_at TEXT,
  completed_at TEXT,
  canceled_at TEXT,
  error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  tool_calls_total INTEGER NOT NULL DEFAULT 0,
  tool_calls_json TEXT NOT NULL DEFAULT '{}',
  turns_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  agent_type TEXT NOT NULL DEFAULT 'scout9'
);

INSERT INTO agent_jobs_new SELECT * FROM agent_jobs;

DROP TABLE agent_jobs;

ALTER TABLE agent_jobs_new RENAME TO agent_jobs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status_created ON agent_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_scope ON agent_jobs(scope_type, scope_value);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_type ON agent_jobs(agent_type);

-- Drop redundant triggers (CHECK constraint now handles validation)
DROP TRIGGER IF EXISTS trg_agent_jobs_scope_type_check;
DROP TRIGGER IF EXISTS trg_agent_jobs_scope_type_check_update;

PRAGMA foreign_keys = ON;
