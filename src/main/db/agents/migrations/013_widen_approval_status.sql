-- Rebuild learned_patterns with wider CHECK and rejection_reason column
CREATE TABLE learned_patterns_new (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  pattern_name TEXT NOT NULL UNIQUE,
  pattern_text TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  approval_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (approval_status IN ('auto_applied', 'pending_review', 'approved', 'rejected')),
  account TEXT,
  stakeholder TEXT,
  source_agent TEXT NOT NULL DEFAULT 'scout9',
  data_points_count INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO learned_patterns_new (id, pattern_name, pattern_text, confidence_score, usage_count, is_active, approval_status, account, stakeholder, source_agent, data_points_count, created_at, updated_at)
SELECT id, pattern_name, pattern_text, confidence_score, usage_count, is_active, approval_status, account, stakeholder, source_agent, data_points_count, created_at, updated_at
FROM learned_patterns;

DROP TABLE learned_patterns;
ALTER TABLE learned_patterns_new RENAME TO learned_patterns;

CREATE INDEX IF NOT EXISTS idx_learned_patterns_active_confidence ON learned_patterns(is_active, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_account ON learned_patterns(account);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_approval_status ON learned_patterns(approval_status);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_source_agent ON learned_patterns(source_agent);
