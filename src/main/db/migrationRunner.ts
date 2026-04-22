import Database from 'better-sqlite3'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { createLogger } from '../services/logger'

const log = createLogger('MigrationRunner')

interface MigrationRunnerOptions {
  database: Database.Database
  migrationsTable: string
  migrationsDir: string
  dbLabel: string
}

interface MigrationFile {
  version: number
  name: string
  fileName: string
}

export function runFileBasedMigrations(options: MigrationRunnerOptions): void {
  const { database, migrationsTable, migrationsDir, dbLabel } = options

  database.exec(`
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const current = database.prepare(
    `SELECT MAX(version) as v FROM ${migrationsTable}`
  ).get() as { v: number } | undefined
  const currentVersion = current?.v ?? 0

  const dirCandidates = [
    migrationsDir,
    join(migrationsDir, '..', 'db', 'migrations'),
    join(migrationsDir, '..', 'db', dbLabel, 'migrations'),
  ]
  const resolvedDir = dirCandidates.find(existsSync)
  if (!resolvedDir) {
    log.info(`[${dbLabel}] No migrations directory found — skipping`)
    return
  }

  const files = discoverMigrationFiles(resolvedDir)

  let applied = 0
  for (const migration of files) {
    if (migration.version <= currentVersion) continue

    log.info(`[${dbLabel}] Running migration ${migration.fileName}`)
    const source = readFileSync(join(resolvedDir, migration.fileName), 'utf-8')
    const tx = database.transaction(() => {
      database.exec(source)
      database.prepare(
        `INSERT INTO ${migrationsTable} (version, name) VALUES (?, ?)`
      ).run(migration.version, migration.name)
    })
    tx()
    applied++
  }

  if (applied > 0) {
    log.info(`[${dbLabel}] Applied ${applied} migration(s), now at version ${currentVersion + applied}`)
  }
}

export function seedMigrationsFromSchema(
  database: Database.Database,
  migrationsTable: string,
  migrationsDir: string
): void {
  const resolvedDir = [migrationsDir].find(existsSync)
  if (!resolvedDir) return

  const files = discoverMigrationFiles(resolvedDir)
  for (const migration of files) {
    database.prepare(
      `INSERT OR IGNORE INTO ${migrationsTable} (version, name) VALUES (?, ?)`
    ).run(migration.version, migration.name)
  }
}

function discoverMigrationFiles(dir: string): MigrationFile[] {
  return readdirSync(dir)
    .map((fileName) => {
      const match = /^(\d+)_([a-zA-Z0-9_-]+)\.sql$/.exec(fileName)
      if (!match) return null
      return { version: Number(match[1]), name: match[2], fileName }
    })
    .filter((item): item is MigrationFile => item !== null)
    .sort((a, b) => a.version - b.version)
}
