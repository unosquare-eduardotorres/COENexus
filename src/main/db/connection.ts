import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createLogger } from '../services/logger'

const log = createLogger('Database')

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'nexus.db')
  db = new Database(dbPath)

  const vecExtPath = resolveVecExtension()
  if (vecExtPath) {
    db.loadExtension(vecExtPath)
  }

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  runInitialSchema(db)
  runMigrations(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDatabase() first')
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function resolveVecExtension(): string | null {
  const baseName = 'vec0'
  const ext = process.platform === 'darwin' ? '.dylib'
    : process.platform === 'win32' ? '.dll'
    : '.so'

  const candidates = [
    join(__dirname, `../../resources/sqlite-vec/${baseName}${ext}`),
    join(__dirname, `../../resources/${baseName}${ext}`),
    join(app.getAppPath(), `resources/sqlite-vec/${baseName}${ext}`),
    join(app.getAppPath(), `resources/${baseName}${ext}`),
    join(__dirname, `../../node_modules/sqlite-vec/${baseName}${ext}`),
  ]

  for (const path of candidates) {
    if (existsSync(path)) return path.replace(ext, '')
  }

  log.warn('sqlite-vec extension not found — vector search will be unavailable')
  return null
}

function runInitialSchema(database: Database.Database): void {
  const hasEmployees = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='synced_employees'"
  ).get()

  if (!hasEmployees) {
    const schemaPath = join(__dirname, 'schema.sql')
    let schemaSource: string
    if (existsSync(schemaPath)) {
      schemaSource = readFileSync(schemaPath, 'utf-8')
    } else {
      schemaSource = getInlineSchema()
    }

    const vecPattern = /CREATE\s+VIRTUAL\s+TABLE[^;]*USING\s+vec0[^;]*;/gi
    const coreSchema = schemaSource.replace(vecPattern, '')
    database.exec(coreSchema)

    const vecStatements = schemaSource.match(vecPattern) || []
    for (const stmt of vecStatements) {
      try {
        database.exec(stmt)
      } catch (err) {
        log.warn('Skipping vec0 virtual table creation (sqlite-vec extension not loaded)')
      }
    }

    database.prepare(
      "INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, 'initial_schema')"
    ).run()
  }
}

function runMigrations(database: Database.Database): void {
  const current = database.prepare(
    'SELECT MAX(version) as v FROM schema_migrations'
  ).get() as { v: number } | undefined

  const _currentVersion = current?.v ?? 0

  // Future migrations go here:
  // if (currentVersion < 2) { runMigration002(database) }
  // if (currentVersion < 3) { runMigration003(database) }
}

function getInlineSchema(): string {
  return `
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
      status TEXT NOT NULL DEFAULT 'synced',
      status_reason TEXT,
      failed INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL
    );

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
    CREATE INDEX IF NOT EXISTS idx_match_sessions_created ON match_sessions(created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_resume_sessions_created ON resume_sessions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_resume_sessions_candidate ON resume_sessions(candidate_upstream_id);
    CREATE INDEX IF NOT EXISTS idx_resume_sessions_employee ON resume_sessions(employee_upstream_id);

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
    CREATE INDEX IF NOT EXISTS idx_transform_sessions_created ON transform_sessions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transform_sessions_context ON transform_sessions(context_type, context_id);

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

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `
}
