ALTER TABLE open_position_candidates ADD COLUMN rejection_feedback TEXT NOT NULL DEFAULT '[]';
ALTER TABLE open_position_candidates ADD COLUMN rejection_comments TEXT NOT NULL DEFAULT '';
ALTER TABLE open_position_candidates ADD COLUMN rejection_action_date TEXT;
