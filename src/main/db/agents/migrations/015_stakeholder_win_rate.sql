ALTER TABLE stakeholder_profiles ADD COLUMN total_closed_positions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stakeholder_profiles ADD COLUMN total_won_positions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stakeholder_profiles ADD COLUMN win_rate REAL;
