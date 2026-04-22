import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, renameSync } from 'fs'
import { createLogger } from '../../services/logger'
import { runFileBasedMigrations, seedMigrationsFromSchema } from '../migrationRunner'

const log = createLogger('AgentsDatabase')

let db: Database.Database | null = null

export function initAgentsDatabase(): Database.Database {
  if (db) return db

  migrateFromScout9()

  const dbPath = join(app.getPath('userData'), 'agents.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  runInitialSchema(db)
  runMigrations(db)

  return db
}

export function getAgentsDatabase(): Database.Database {
  if (!db) throw new Error('Agents database not initialized - call initAgentsDatabase() first')
  return db
}

export function closeAgentsDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function migrateFromScout9(): void {
  const userDataPath = app.getPath('userData')
  const oldDbPath = join(userDataPath, 'scout9.db')
  const newDbPath = join(userDataPath, 'agents.db')

  if (existsSync(oldDbPath) && !existsSync(newDbPath)) {
    renameSync(oldDbPath, newDbPath)
  }

  const sidecars = ['-wal', '-shm']
  for (const suffix of sidecars) {
    const oldSidecarPath = `${oldDbPath}${suffix}`
    const newSidecarPath = `${newDbPath}${suffix}`
    if (existsSync(oldSidecarPath) && !existsSync(newSidecarPath)) {
      renameSync(oldSidecarPath, newSidecarPath)
    }
  }
}

function runInitialSchema(database: Database.Database): void {
  const hasJobsTable = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_jobs'"
  ).get()

  if (!hasJobsTable) {
    const schemaCandidates = [
      join(__dirname, 'db', 'agents', 'schema.sql'),
      join(__dirname, 'schema.sql'),
    ]
    const schemaPath = schemaCandidates.find(existsSync) ?? schemaCandidates[0]
    if (!existsSync(schemaPath)) {
      log.warn('schema.sql not found at expected agents database location; skipping schema initialization')
      database.exec(`
        CREATE TABLE IF NOT EXISTS scout9_schema_migrations (
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
      "INSERT OR IGNORE INTO scout9_schema_migrations (version, name) VALUES (1, 'initial_schema')"
    ).run()

    seedMigrationsFromSchema(database, 'scout9_schema_migrations', join(__dirname, 'db', 'agents', 'migrations'))
  }
}

function runMigrations(database: Database.Database): void {
  runFileBasedMigrations({
    database,
    migrationsTable: 'scout9_schema_migrations',
    migrationsDir: join(__dirname, 'db', 'agents', 'migrations'),
    dbLabel: 'agents',
  })
}
