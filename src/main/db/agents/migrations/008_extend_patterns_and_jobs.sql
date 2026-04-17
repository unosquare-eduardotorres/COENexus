ALTER TABLE learned_patterns ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending_review'
  CHECK (approval_status IN ('auto_applied', 'pending_review'));
ALTER TABLE learned_patterns ADD COLUMN account TEXT;
ALTER TABLE learned_patterns ADD COLUMN stakeholder TEXT;
ALTER TABLE learned_patterns ADD COLUMN source_agent TEXT NOT NULL DEFAULT 'scout9';
ALTER TABLE learned_patterns ADD COLUMN data_points_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE agent_jobs ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'scout9';

CREATE TRIGGER IF NOT EXISTS trg_agent_jobs_scope_type_check
  BEFORE INSERT ON agent_jobs
  WHEN NEW.scope_type NOT IN ('org', 'project', 'custom', 'account', 'stakeholder')
BEGIN
  SELECT RAISE(ABORT, 'Invalid scope_type');
END;

CREATE TRIGGER IF NOT EXISTS trg_agent_jobs_scope_type_check_update
  BEFORE UPDATE OF scope_type ON agent_jobs
  WHEN NEW.scope_type NOT IN ('org', 'project', 'custom', 'account', 'stakeholder')
BEGIN
  SELECT RAISE(ABORT, 'Invalid scope_type');
END;

CREATE INDEX IF NOT EXISTS idx_learned_patterns_account
  ON learned_patterns(account);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_approval_status
  ON learned_patterns(approval_status);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_source_agent
  ON learned_patterns(source_agent);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_type
  ON agent_jobs(agent_type);
