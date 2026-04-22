ALTER TABLE vigil_config ADD COLUMN schedule_days_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]';
ALTER TABLE vigil_config ADD COLUMN active_positions_only INTEGER NOT NULL DEFAULT 1 CHECK (active_positions_only IN (0, 1));
