-- Switch placement margin sync from per-quarter/per-month to full YTD.
-- Adds tac_at_placement / current_tac columns from the Ytd endpoint.
-- Changes unique key from (year, quarter, email, open_position_id)
--   to (year, name, placement_date, account) since Ytd entries lack
--   email and open_position_id.

DROP TABLE IF EXISTS synced_placement_margins;

CREATE TABLE synced_placement_margins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL DEFAULT 0,
  email TEXT NOT NULL DEFAULT '',
  name TEXT,
  account TEXT,
  main_skill TEXT,
  country TEXT,
  open_position_id INTEGER,
  placement_date TEXT,
  leave_date TEXT,
  placement_rate REAL,
  placement_margin REAL,
  current_margin REAL,
  placement_revenue REAL,
  current_revenue REAL,
  placement_monthly_salary REAL,
  current_monthly_salary REAL,
  company_tenure INTEGER,
  allocation REAL DEFAULT 0,
  is_promotion INTEGER DEFAULT 0,
  first_time_entry_date TEXT,
  kickoff_delay INTEGER,
  tac_at_placement REAL,
  current_tac REAL,
  synced_at TEXT NOT NULL,
  UNIQUE(year, name, placement_date, account)
);

CREATE INDEX IF NOT EXISTS idx_placement_margins_year
  ON synced_placement_margins(year);

CREATE INDEX IF NOT EXISTS idx_placement_margins_account
  ON synced_placement_margins(account);

CREATE INDEX IF NOT EXISTS idx_placement_margins_placement_date
  ON synced_placement_margins(placement_date);
