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
