-- Migration 002: Add plan-aligned columns to agent_config
-- These columns support the Scout-9 pipeline runtime configuration
ALTER TABLE agent_config ADD COLUMN sonnet_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514';
ALTER TABLE agent_config ADD COLUMN haiku_model TEXT NOT NULL DEFAULT 'claude-haiku-3-5-20241022';
ALTER TABLE agent_config ADD COLUMN max_tool_calls_per_run INTEGER NOT NULL DEFAULT 20;
ALTER TABLE agent_config ADD COLUMN max_tool_calls_per_candidate INTEGER NOT NULL DEFAULT 3;
ALTER TABLE agent_config ADD COLUMN token_budget_ceiling INTEGER NOT NULL DEFAULT 6000;
ALTER TABLE agent_config ADD COLUMN max_turns INTEGER NOT NULL DEFAULT 50;
ALTER TABLE agent_config ADD COLUMN max_run_duration_ms INTEGER NOT NULL DEFAULT 600000;
ALTER TABLE agent_config ADD COLUMN stream_watchdog_ms INTEGER NOT NULL DEFAULT 120000;
ALTER TABLE agent_config ADD COLUMN tool_timeout_ms INTEGER NOT NULL DEFAULT 5000;

-- Add telemetry columns to agent_jobs for token/tool tracking (F13, F14)
ALTER TABLE agent_jobs ADD COLUMN input_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_jobs ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_jobs ADD COLUMN tool_calls_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_jobs ADD COLUMN tool_calls_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE agent_jobs ADD COLUMN turns_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_jobs ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0;
