ALTER TABLE resume_embeddings ADD COLUMN extracted_skills_json TEXT;
ALTER TABLE resume_embeddings ADD COLUMN skills_extracted_at TEXT;
ALTER TABLE resume_embeddings ADD COLUMN skills_extractor_model TEXT;

CREATE INDEX IF NOT EXISTS idx_resume_embeddings_skills_extracted
  ON resume_embeddings(skills_extracted_at)
  WHERE extracted_skills_json IS NOT NULL;
