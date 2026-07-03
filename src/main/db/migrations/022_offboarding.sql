CREATE TABLE IF NOT EXISTS synced_offboardings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  employee TEXT NOT NULL,
  account TEXT,
  location TEXT,
  seniority TEXT,
  main_skill TEXT,
  unosquare_tenure INTEGER,
  monthly_gross_salary REAL,
  monthly_tac REAL,
  rate REAL,
  gm REAL,
  offboarding_date TEXT,
  offboarding_status TEXT,
  leave_reason_type TEXT,
  leave_reason_details TEXT,
  leave_reason TEXT,
  synced_at TEXT NOT NULL,
  UNIQUE(year, employee, offboarding_date, account)
);

CREATE INDEX IF NOT EXISTS idx_offboardings_year
  ON synced_offboardings(year);

CREATE INDEX IF NOT EXISTS idx_offboardings_account
  ON synced_offboardings(account);

CREATE INDEX IF NOT EXISTS idx_offboardings_offboarding_date
  ON synced_offboardings(offboarding_date);
