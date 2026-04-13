PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS synced_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upstream_id INTEGER NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  gross_monthly_salary REAL,
  salary_currency TEXT,
  last_account TEXT,
  last_account_start_date TEXT,
  rate REAL,
  has_resume INTEGER NOT NULL DEFAULT 0,
  resume_note_id INTEGER,
  resume_date_created TEXT,
  resume_filename TEXT,
  is_bench INTEGER NOT NULL DEFAULT 0,
  job_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'synced',
  status_reason TEXT,
  failed INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS synced_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upstream_id INTEGER NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  seniority TEXT,
  main_skill TEXT,
  country TEXT,
  current_salary REAL,
  salary_currency TEXT,
  coe_certified INTEGER NOT NULL DEFAULT 0,
  candidate_status TEXT,
  last_status_update TEXT,
  salary_expectations REAL,
  salary_expectations_currency TEXT,
  has_resume INTEGER NOT NULL DEFAULT 0,
  resume_note_id INTEGER,
  resume_date_created TEXT,
  resume_filename TEXT,
  status TEXT NOT NULL DEFAULT 'synced',
  status_reason TEXT,
  failed INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS synced_open_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upstream_id INTEGER NOT NULL UNIQUE,
  account TEXT NOT NULL DEFAULT '',
  coe TEXT NOT NULL DEFAULT '',
  practice TEXT NOT NULL DEFAULT '',
  stakeholder TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  countries TEXT NOT NULL DEFAULT '',
  seniorities TEXT NOT NULL DEFAULT '',
  available_range TEXT NOT NULL DEFAULT '',
  account_overview TEXT NOT NULL DEFAULT '',
  job_description TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  position_status TEXT NOT NULL DEFAULT 'Active',
  aging INTEGER NOT NULL DEFAULT 0,
  created TEXT,
  ready_date TEXT,
  last_modification TEXT,
  sourcing TEXT NOT NULL DEFAULT '',
  replacement INTEGER NOT NULL DEFAULT 0,
  vertical_industry TEXT NOT NULL DEFAULT '',
  in_office INTEGER NOT NULL DEFAULT 0,
  csu TEXT NOT NULL DEFAULT '',
  cs TEXT NOT NULL DEFAULT '',
  closed_date TEXT,
  closed_reason TEXT,
  is_ready INTEGER NOT NULL DEFAULT 0,
  is_promotion INTEGER NOT NULL DEFAULT 0,
  maximum_rate REAL,
  minimum_rate REAL,
  additional_skills TEXT NOT NULL DEFAULT '[]',
  created_with_assignments_tool INTEGER,
  candidates_presented INTEGER NOT NULL DEFAULT 0,
  last_discussion_date TEXT,
  status TEXT NOT NULL DEFAULT 'synced',
  status_reason TEXT,
  failed INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS open_position_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_position_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  parent_comment_id INTEGER,
  synced_at TEXT NOT NULL,
  UNIQUE(open_position_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_op_discussions_position
  ON open_position_discussions(open_position_id);

CREATE TABLE IF NOT EXISTS resume_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  upstream_id INTEGER NOT NULL,
  embedding BLOB,
  resume_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_bench INTEGER NOT NULL DEFAULT 0,
  UNIQUE(source_type, source_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(
  embedding float[1024]
);

CREATE TABLE IF NOT EXISTS match_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  match_flow_type TEXT NOT NULL DEFAULT '',
  data_source TEXT NOT NULL DEFAULT '',
  top_n INTEGER NOT NULL DEFAULT 10,
  search_mode TEXT NOT NULL DEFAULT 'opus',
  job_description TEXT NOT NULL DEFAULT '',
  jd_source TEXT NOT NULL DEFAULT '',
  constraints_json TEXT,
  pipeline_stats_json TEXT,
  pipeline_stages_json TEXT,
  results_json TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_match_sessions_created
  ON match_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS resume_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT '',
  candidate_upstream_id INTEGER,
  employee_upstream_id INTEGER,
  current_step_key TEXT NOT NULL DEFAULT 'processing',
  completed_steps_json TEXT,
  stepper_context_json TEXT,
  resume_content_json TEXT,
  original_resume_text TEXT,
  original_file_name TEXT,
  original_file_type TEXT,
  processing_mode TEXT NOT NULL DEFAULT 'single',
  refinement_mode TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  vectorization_status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  resume_embedding_id INTEGER REFERENCES resume_embeddings(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_resume_sessions_created
  ON resume_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_sessions_candidate
  ON resume_sessions(candidate_upstream_id);
CREATE INDEX IF NOT EXISTS idx_resume_sessions_employee
  ON resume_sessions(employee_upstream_id);

CREATE TABLE IF NOT EXISTS transform_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  context_type TEXT NOT NULL DEFAULT '',
  context_id INTEGER,
  context_name TEXT NOT NULL DEFAULT '',
  processing_mode TEXT NOT NULL DEFAULT 'single',
  refinement_mode TEXT NOT NULL DEFAULT '',
  job_description TEXT,
  job_description_source TEXT,
  selected_position_id TEXT,
  resume_content_json TEXT,
  wizard_state_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transform_sessions_created
  ON transform_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transform_sessions_context
  ON transform_sessions(context_type, context_id);

CREATE TABLE IF NOT EXISTS open_position_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_position_id INTEGER NOT NULL,
  candidate_requisition_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  is_employee INTEGER NOT NULL DEFAULT 0,
  candidate_status TEXT NOT NULL DEFAULT '',
  rate REAL NOT NULL DEFAULT 0,
  start_date TEXT,
  synced_at TEXT NOT NULL,
  UNIQUE(open_position_id, candidate_requisition_id)
);

CREATE TABLE IF NOT EXISTS candidate_analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_upstream_id INTEGER NOT NULL,
  candidate_source_type TEXT NOT NULL,
  jd_hash TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(candidate_upstream_id, candidate_source_type, jd_hash)
);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_lookup
  ON candidate_analysis_cache(candidate_upstream_id, candidate_source_type, jd_hash);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
