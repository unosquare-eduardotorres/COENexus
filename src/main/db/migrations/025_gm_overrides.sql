CREATE TABLE IF NOT EXISTS plb_gm_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  employee TEXT NOT NULL,
  offboarding_date TEXT,
  account TEXT,
  gm_override REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(year, employee, offboarding_date, account)
);
