ALTER TABLE synced_candidates ADD COLUMN normalized_monthly_usd REAL;
ALTER TABLE synced_candidates ADD COLUMN inferred_currency TEXT;
ALTER TABLE synced_candidates ADD COLUMN currency_confidence TEXT CHECK (currency_confidence IN ('high', 'medium', 'low', 'exact'));

ALTER TABLE synced_employees ADD COLUMN normalized_monthly_usd REAL;
ALTER TABLE synced_employees ADD COLUMN inferred_currency TEXT;
ALTER TABLE synced_employees ADD COLUMN currency_confidence TEXT CHECK (currency_confidence IN ('high', 'medium', 'low', 'exact'));
