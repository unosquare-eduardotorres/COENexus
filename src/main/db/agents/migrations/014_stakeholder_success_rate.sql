ALTER TABLE stakeholder_profiles ADD COLUMN total_candidates_presented INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stakeholder_profiles ADD COLUMN total_candidates_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stakeholder_profiles ADD COLUMN success_rate REAL;
ALTER TABLE stakeholder_profiles ADD COLUMN avg_published_rate REAL;
ALTER TABLE stakeholder_profiles ADD COLUMN avg_days_to_close REAL;
