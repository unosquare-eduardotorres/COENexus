-- Convert legacy failed records to new pipeline error statuses.
-- Records with status='failed' are assumed to have failed during extraction
-- since that was the most common failure path.
UPDATE synced_employees SET status = 'extract_failed' WHERE status = 'failed';
UPDATE synced_candidates SET status = 'extract_failed' WHERE status = 'failed';
UPDATE synced_open_positions SET status = 'extract_failed' WHERE status = 'failed';
