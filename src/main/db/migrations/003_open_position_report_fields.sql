-- Migration 002: Add fields for C.O.R.E. Open Positions report
-- Adds report-critical + detail-view fields to synced_open_positions
-- Creates open_position_discussions table for stalled position evaluation

ALTER TABLE synced_open_positions ADD COLUMN vertical_industry TEXT NOT NULL DEFAULT '';
ALTER TABLE synced_open_positions ADD COLUMN in_office INTEGER NOT NULL DEFAULT 0;
ALTER TABLE synced_open_positions ADD COLUMN csu TEXT NOT NULL DEFAULT '';
ALTER TABLE synced_open_positions ADD COLUMN cs TEXT NOT NULL DEFAULT '';
ALTER TABLE synced_open_positions ADD COLUMN closed_date TEXT;
ALTER TABLE synced_open_positions ADD COLUMN closed_reason TEXT;
ALTER TABLE synced_open_positions ADD COLUMN is_ready INTEGER NOT NULL DEFAULT 0;
ALTER TABLE synced_open_positions ADD COLUMN is_promotion INTEGER NOT NULL DEFAULT 0;
ALTER TABLE synced_open_positions ADD COLUMN maximum_rate REAL;
ALTER TABLE synced_open_positions ADD COLUMN minimum_rate REAL;
ALTER TABLE synced_open_positions ADD COLUMN additional_skills TEXT NOT NULL DEFAULT '[]';
ALTER TABLE synced_open_positions ADD COLUMN created_with_assignments_tool INTEGER;
ALTER TABLE synced_open_positions ADD COLUMN candidates_presented INTEGER NOT NULL DEFAULT 0;
ALTER TABLE synced_open_positions ADD COLUMN last_discussion_date TEXT;

CREATE TABLE IF NOT EXISTS open_position_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_position_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  parent_comment_id INTEGER,
  synced_at TEXT NOT NULL,
  UNIQUE(open_position_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_op_discussions_position
  ON open_position_discussions(open_position_id);
