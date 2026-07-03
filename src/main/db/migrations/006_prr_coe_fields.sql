ALTER TABLE synced_project_reallocations ADD COLUMN coe_status TEXT NOT NULL DEFAULT 'Undefined';
ALTER TABLE synced_project_reallocations ADD COLUMN coe_comments TEXT NOT NULL DEFAULT '[]';
