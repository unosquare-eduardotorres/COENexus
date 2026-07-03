-- Individual placement entries synced from exec API
CREATE TABLE IF NOT EXISTS synced_placement_margins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  email TEXT NOT NULL,
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
  synced_at TEXT NOT NULL,
  UNIQUE(year, quarter, email, open_position_id)
);

CREATE INDEX IF NOT EXISTS idx_placement_margins_year_quarter
  ON synced_placement_margins(year, quarter);

CREATE INDEX IF NOT EXISTS idx_placement_margins_account
  ON synced_placement_margins(account);

-- YTD summary + monthly trend (one row per year/quarter sync)
CREATE TABLE IF NOT EXISTS synced_placement_margin_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  ytd_margin REAL,
  ytd_avg_rate REAL,
  period_margin REAL,
  period_avg_rate REAL,
  monthly_trend_json TEXT,
  synced_at TEXT NOT NULL,
  UNIQUE(year, quarter)
);
