PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS scout9_schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  scope_type TEXT NOT NULL DEFAULT 'org' CHECK (scope_type IN ('org', 'project', 'custom')),
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_reports (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL,
  report_title TEXT NOT NULL DEFAULT '',
  report_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  confidence_score REAL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_candidates (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  report_id TEXT NOT NULL,
  candidate_type TEXT NOT NULL DEFAULT 'issue' CHECK (candidate_type IN ('issue', 'insight', 'action')),
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  confidence_score REAL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES agent_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_rules (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  rule_name TEXT NOT NULL UNIQUE,
  rule_text TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_glossary (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  synonyms TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  note_title TEXT NOT NULL,
  note_text TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learned_patterns (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  pattern_name TEXT NOT NULL UNIQUE,
  pattern_text TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pattern_applications (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  pattern_id TEXT NOT NULL,
  job_id TEXT,
  report_id TEXT,
  candidate_id TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  outcome TEXT,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pattern_id) REFERENCES learned_patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (report_id) REFERENCES agent_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (candidate_id) REFERENCES report_candidates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skip_feedback (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  candidate_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (candidate_id) REFERENCES report_candidates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brain_snapshots (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  snapshot_markdown TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  source_job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS system_prompt_versions (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  version_label TEXT NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  change_summary TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  model_name TEXT NOT NULL DEFAULT 'gpt-5',
  token_budget INTEGER NOT NULL DEFAULT 120000,
  temperature REAL NOT NULL DEFAULT 0.2,
  max_reports_per_run INTEGER NOT NULL DEFAULT 20,
  auto_publish_enabled INTEGER NOT NULL DEFAULT 0 CHECK (auto_publish_enabled IN (0, 1)),
  include_patterns INTEGER NOT NULL DEFAULT 1 CHECK (include_patterns IN (0, 1)),
  include_glossary INTEGER NOT NULL DEFAULT 1 CHECK (include_glossary IN (0, 1)),
  include_notes INTEGER NOT NULL DEFAULT 1 CHECK (include_notes IN (0, 1)),
  active_prompt_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (active_prompt_version_id) REFERENCES system_prompt_versions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_rule_overrides (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  override_text TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, rule_id),
  FOREIGN KEY (rule_id) REFERENCES knowledge_rules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL,
  upstream_catalog_name TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency TEXT PRIMARY KEY NOT NULL,
  rate_to_usd REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO exchange_rates (currency, rate_to_usd) VALUES
  ('USD', 1.0),
  ('MXN', 0.058),
  ('COP', 0.000235),
  ('BOB', 0.145),
  ('GBP', 1.26),
  ('PYG', 0.000131);

CREATE TABLE IF NOT EXISTS salary_bands (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL REFERENCES countries(code),
  job_family_group TEXT NOT NULL DEFAULT 'engineering',
  band TEXT NOT NULL,
  level INTEGER NOT NULL,
  min_monthly REAL NOT NULL,
  max_monthly REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (country_code, job_family_group, band, level)
);

CREATE TABLE IF NOT EXISTS job_families (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  job_family_group TEXT NOT NULL DEFAULT 'engineering',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO agent_config (id) VALUES (1);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_status_created
  ON agent_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_scope
  ON agent_jobs(scope_type, scope_value);
CREATE INDEX IF NOT EXISTS idx_agent_reports_job_created
  ON agent_reports(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_reports_status
  ON agent_reports(status);
CREATE INDEX IF NOT EXISTS idx_report_candidates_report_status
  ON report_candidates(report_id, status);
CREATE INDEX IF NOT EXISTS idx_report_candidates_type
  ON report_candidates(candidate_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_rules_active_priority
  ON knowledge_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_knowledge_glossary_active
  ON knowledge_glossary(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_active_updated
  ON knowledge_notes(is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_active_confidence
  ON learned_patterns(is_active, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_applications_pattern_applied
  ON pattern_applications(pattern_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_applications_job
  ON pattern_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_pattern_applications_report
  ON pattern_applications(report_id);
CREATE INDEX IF NOT EXISTS idx_skip_feedback_candidate_created
  ON skip_feedback(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_snapshots_created
  ON brain_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_prompt_versions_active_created
  ON system_prompt_versions(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_rule_overrides_client_active
  ON client_rule_overrides(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_rule_overrides_rule
  ON client_rule_overrides(rule_id);
CREATE INDEX IF NOT EXISTS idx_salary_bands_country_group_active
  ON salary_bands(country_code, job_family_group, is_active);
CREATE INDEX IF NOT EXISTS idx_salary_bands_band_level
  ON salary_bands(band, level);
