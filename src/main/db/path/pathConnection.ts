import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createLogger } from '../../services/logger'

const log = createLogger('PathDatabase')

let db: Database.Database | null = null

export function initPathDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'path.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  runInitialSchema(db)
  runMigrations(db)

  return db
}

export function getPathDatabase(): Database.Database {
  if (!db) throw new Error('PATH database not initialized — call initPathDatabase() first')
  return db
}

export function closePathDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function runInitialSchema(database: Database.Database): void {
  const hasSeniorityLevels = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='seniority_levels'"
  ).get()

  if (!hasSeniorityLevels) {
    const schemaPath = join(__dirname, 'schema.sql')
    if (!existsSync(schemaPath)) {
      log.warn('schema.sql not found at expected PATH database location; skipping schema initialization')
      database.exec(`
        CREATE TABLE IF NOT EXISTS path_schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
      return
    }

    const schemaSource = readFileSync(schemaPath, 'utf-8')
    database.exec(schemaSource)
    database.prepare(
      "INSERT OR IGNORE INTO path_schema_migrations (version, name) VALUES (1, 'initial_schema')"
    ).run()
  }
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS path_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const current = database.prepare(
    'SELECT MAX(version) as v FROM path_schema_migrations'
  ).get() as { v: number } | undefined

  const currentVersion = current?.v ?? 0

  if (currentVersion < 1) {
    database.prepare(
      "INSERT OR IGNORE INTO path_schema_migrations (version, name) VALUES (1, 'initial_schema')"
    ).run()
  }
}
