-- Migration 008: Reconcile status column with actual embedding state
-- Fixes records whose status disagrees with resume_embeddings table

-- Records that have full embeddings (text + vector) but status isn't 'vectorized'
UPDATE synced_employees SET status = 'vectorized', status_reason = NULL
WHERE id IN (
  SELECT e.id FROM synced_employees e
  JOIN resume_embeddings re ON re.source_type = 'employees' AND re.source_id = e.id
  WHERE re.resume_text IS NOT NULL AND re.resume_text != '' AND re.embedding IS NOT NULL
    AND e.status NOT IN ('vectorized', 'vectorize_failed')
);

UPDATE synced_candidates SET status = 'vectorized', status_reason = NULL
WHERE id IN (
  SELECT c.id FROM synced_candidates c
  JOIN resume_embeddings re ON re.source_type = 'candidates' AND re.source_id = c.id
  WHERE re.resume_text IS NOT NULL AND re.resume_text != '' AND re.embedding IS NOT NULL
    AND c.status NOT IN ('vectorized', 'vectorize_failed')
);

-- Records that have extracted text but no vector, and status isn't 'extracted'
UPDATE synced_employees SET status = 'extracted', status_reason = NULL
WHERE id IN (
  SELECT e.id FROM synced_employees e
  JOIN resume_embeddings re ON re.source_type = 'employees' AND re.source_id = e.id
  WHERE re.resume_text IS NOT NULL AND re.resume_text != '' AND re.embedding IS NULL
    AND e.status NOT IN ('extracted', 'extract_failed', 'vectorize_failed')
);

UPDATE synced_candidates SET status = 'extracted', status_reason = NULL
WHERE id IN (
  SELECT c.id FROM synced_candidates c
  JOIN resume_embeddings re ON re.source_type = 'candidates' AND re.source_id = c.id
  WHERE re.resume_text IS NOT NULL AND re.resume_text != '' AND re.embedding IS NULL
    AND c.status NOT IN ('extracted', 'extract_failed', 'vectorize_failed')
);

-- Fix stale 'processing' status (from interrupted operations)
UPDATE synced_employees SET status = 'synced' WHERE status = 'processing';
UPDATE synced_candidates SET status = 'synced' WHERE status = 'processing';
