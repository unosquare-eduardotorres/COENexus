UPDATE synced_project_reallocations SET coe_status = 'Not Set' WHERE coe_status = 'Undefined';
UPDATE synced_project_reallocations SET coe_status = 'Pending Evaluation' WHERE coe_status = 'Active';
UPDATE synced_project_reallocations SET coe_status = 'Ready to Present' WHERE coe_status = 'Idle';
UPDATE synced_project_reallocations SET coe_status = 'Not Applies' WHERE coe_status = 'Not Apply';
