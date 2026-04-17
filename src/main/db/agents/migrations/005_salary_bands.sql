-- 005_salary_bands.sql
-- Salary bands reference table and job family mapping

CREATE TABLE IF NOT EXISTS salary_bands (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  pay_period TEXT NOT NULL CHECK (pay_period IN ('monthly', 'yearly', 'hourly')),
  job_family_group TEXT NOT NULL DEFAULT 'engineering',
  band TEXT NOT NULL,
  level INTEGER NOT NULL,
  min_salary REAL NOT NULL,
  max_salary REAL NOT NULL,
  gross_margin_usd REAL,
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

CREATE TABLE IF NOT EXISTS job_families (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  job_family_group TEXT NOT NULL DEFAULT 'engineering',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Job family seed data
INSERT OR IGNORE INTO job_families (name, job_family_group) VALUES
  ('Software Development Professional', 'engineering'),
  ('Business Analysis Professional', 'engineering'),
  ('Project Management Professional', 'engineering'),
  ('IT Operations Professional', 'engineering'),
  ('IT Security Professional', 'engineering'),
  ('UI/UX Design Professional', 'engineering'),
  ('Quality Assurance Professional (Functional)', 'qa_support'),
  ('IT Support', 'qa_support');

-- =============================================
-- Mexico (MX) — MXN, monthly — Engineering
-- =============================================
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Trainee', 0, 9500, 15999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Trainee', 1, 16000, 19999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Junior', 1, 20000, 29999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Intermediate', 1, 30000, 34999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Intermediate', 2, 35000, 39999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Intermediate', 3, 40000, 49999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Intermediate', 4, 50000, 59999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Senior', 1, 60000, 69999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Senior', 2, 70000, 84999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'engineering', 'Principal', 1, 85000, 100000);

-- Mexico (MX) — MXN, monthly — QA/Support
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Trainee', 0, 9500, 13999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Trainee', 1, 14000, 15999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Junior', 1, 16000, 24999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Intermediate', 1, 25000, 29999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Intermediate', 2, 30000, 34999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Intermediate', 3, 35000, 39999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Intermediate', 4, 40000, 44999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Senior', 1, 45000, 49999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Senior', 2, 50000, 59999),
  ('MX', 'Mexico', 'MXN', 'monthly', 'qa_support', 'Principal', 1, 60000, 100000);

-- =============================================
-- Bolivia (BOL) — BOB, monthly — Engineering
-- =============================================
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Trainee', 0, 2500, 5000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Junior', 1, 5000, 8300),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Intermediate', 1, 8301, 10500),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Intermediate', 2, 10501, 12500),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Intermediate', 3, 12501, 14500),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Intermediate', 4, 14501, 16500),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Senior', 1, 16501, 19000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Senior', 2, 19501, 21500),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Lead', 1, 21501, 23000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'engineering', 'Principal', 1, 23001, 25500);

-- Bolivia (BOL) — BOB, monthly — QA/Support
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Trainee', 0, 2500, 4000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Junior', 1, 4001, 7000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Intermediate', 1, 7001, 8000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Intermediate', 2, 8001, 9000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Intermediate', 3, 9001, 10000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Intermediate', 4, 10001, 11000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Senior', 1, 11001, 12000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Senior', 2, 12001, 13000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Lead', 1, 13001, 14000),
  ('BOL', 'Bolivia', 'BOB', 'monthly', 'qa_support', 'Principal', 1, 14001, 15000);

-- =============================================
-- United Kingdom (UK) — GBP, yearly — Engineering only
-- =============================================
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary, gross_margin_usd) VALUES
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Trainee', 0, 22000, 25000, 55);
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Trainee', 1, 25000, 29000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Junior', 1, 29000, 34000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Intermediate', 1, 32000, 36000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Intermediate', 2, 34000, 38000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Intermediate', 3, 36000, 40000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Intermediate', 4, 40000, 44000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Senior', 1, 44000, 50000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Senior', 2, 50000, 55000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Lead', 1, 55000, 70000),
  ('UK', 'United Kingdom', 'GBP', 'yearly', 'engineering', 'Principal', 1, 70000, 90000);

-- =============================================
-- Colombia (CO) — COP, monthly — Engineering
-- =============================================
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Trainee', 0, 1800000, 2500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Trainee', 1, 2500000, 3500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Junior', 1, 3500000, 5500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Intermediate', 1, 5500000, 6500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Intermediate', 2, 6500000, 7500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Intermediate', 3, 7500000, 9000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Intermediate', 4, 9000000, 11000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Senior', 1, 11000000, 13000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Senior', 2, 13000000, 15000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'engineering', 'Principal', 1, 15000000, 17000000);

-- Colombia (CO) — COP, monthly — QA/Support
INSERT OR IGNORE INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary) VALUES
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Trainee', 0, 1800000, 2000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Trainee', 1, 2000000, 3000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Junior', 1, 3000000, 4000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Intermediate', 1, 4000000, 5000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Intermediate', 2, 5000000, 6000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Intermediate', 3, 6000000, 7000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Intermediate', 4, 7000000, 8000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Senior', 1, 8000000, 9000000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Senior', 2, 9000000, 10500000),
  ('CO', 'Colombia', 'COP', 'monthly', 'qa_support', 'Principal', 1, 10500000, 11500000);
