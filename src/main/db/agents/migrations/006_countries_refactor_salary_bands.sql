-- 006_countries_refactor_salary_bands.sql
-- Create countries reference table, refactor salary_bands to drop redundant columns,
-- rename min_salary/max_salary → min_monthly/max_monthly, normalize UK yearly data to monthly (÷12).

-- =============================================
-- 1. Create countries reference table
-- =============================================
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL,
  upstream_catalog_name TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO countries (code, name, default_currency, upstream_catalog_name) VALUES
  ('MX',  'Mexico',         'MXN', 'Mexico'),
  ('BOL', 'Bolivia',        'BOB', 'Bolivia'),
  ('UK',  'United Kingdom', 'GBP', 'United Kingdom'),
  ('CO',  'Colombia',       'COP', 'Colombia'),
  ('US',  'United States',  'USD', 'United States'),
  ('PRY', 'Paraguay',       'PYG', 'Paraguay');

-- =============================================
-- 2. Migrate salary_bands to lean schema
-- =============================================
ALTER TABLE salary_bands RENAME TO salary_bands_old;

CREATE TABLE IF NOT EXISTS salary_bands (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL REFERENCES countries(code),
  job_family_group TEXT NOT NULL DEFAULT 'engineering',
  band TEXT NOT NULL,
  level INTEGER NOT NULL,
  min_monthly REAL NOT NULL,
  max_monthly REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (country_code, job_family_group, band, level)
);

CREATE INDEX IF NOT EXISTS idx_salary_bands_country_group_active
  ON salary_bands(country_code, job_family_group, is_active);
CREATE INDEX IF NOT EXISTS idx_salary_bands_band_level
  ON salary_bands(band, level);

INSERT INTO salary_bands (id, country_code, job_family_group, band, level, min_monthly, max_monthly, source, is_active, created_at, updated_at)
SELECT
  id, country_code, job_family_group, band, level,
  CASE WHEN pay_period = 'yearly' THEN ROUND(min_salary / 12.0, 2) ELSE min_salary END,
  CASE WHEN pay_period = 'yearly' THEN ROUND(max_salary / 12.0, 2) ELSE max_salary END,
  source, is_active, created_at, updated_at
FROM salary_bands_old;

DROP TABLE salary_bands_old;
