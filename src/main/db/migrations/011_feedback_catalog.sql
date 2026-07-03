CREATE TABLE IF NOT EXISTS feedback_catalog (
  id INTEGER PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);
