import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { runFileBasedMigrations, seedMigrationsFromSchema } from '../migrationRunner'

vi.mock('../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

describe('runFileBasedMigrations', () => {
  let db: Database.Database
  let migrationsDir: string

  beforeEach(() => {
    db = new Database(':memory:')
    migrationsDir = mkdtempSync(join(tmpdir(), 'migrations-test-'))
  })

  afterEach(() => {
    db.close()
  })

  it('should create migrations table if it does not exist', () => {
    runFileBasedMigrations({
      database: db,
      migrationsTable: 'schema_migrations',
      migrationsDir,
      dbLabel: 'test',
    })

    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    ).get()
    expect(table).toBeTruthy()
  })

  it('should apply pending migrations in version order', () => {
    writeFileSync(join(migrationsDir, '002_add_users.sql'), 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);')
    writeFileSync(join(migrationsDir, '003_add_posts.sql'), 'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT);')

    runFileBasedMigrations({
      database: db,
      migrationsTable: 'schema_migrations',
      migrationsDir,
      dbLabel: 'test',
    })

    const users = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()
    const posts = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").get()
    expect(users).toBeTruthy()
    expect(posts).toBeTruthy()

    const versions = db.prepare('SELECT version, name FROM schema_migrations ORDER BY version').all() as { version: number; name: string }[]
    expect(versions).toEqual([
      { version: 2, name: 'add_users' },
      { version: 3, name: 'add_posts' },
    ])
  })

  it('should skip already-applied migrations', () => {
    db.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO schema_migrations (version, name) VALUES (2, 'add_users');
    `)
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);')

    writeFileSync(join(migrationsDir, '002_add_users.sql'), 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);')
    writeFileSync(join(migrationsDir, '003_add_posts.sql'), 'CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT);')

    runFileBasedMigrations({
      database: db,
      migrationsTable: 'schema_migrations',
      migrationsDir,
      dbLabel: 'test',
    })

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    expect(versions.map(v => v.version)).toEqual([2, 3])
  })

  it('should rollback a failed migration without recording the version', () => {
    writeFileSync(join(migrationsDir, '002_good.sql'), 'CREATE TABLE good_table (id INTEGER PRIMARY KEY);')
    writeFileSync(join(migrationsDir, '003_bad.sql'), 'THIS IS NOT VALID SQL;')

    expect(() =>
      runFileBasedMigrations({
        database: db,
        migrationsTable: 'schema_migrations',
        migrationsDir,
        dbLabel: 'test',
      })
    ).toThrow()

    const goodTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='good_table'").get()
    expect(goodTable).toBeTruthy()

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    expect(versions.map(v => v.version)).toEqual([2])
  })

  it('should ignore non-sql files and files without version prefix', () => {
    writeFileSync(join(migrationsDir, 'README.md'), '# Migrations')
    writeFileSync(join(migrationsDir, 'notes.txt'), 'some notes')
    writeFileSync(join(migrationsDir, '002_valid.sql'), 'CREATE TABLE valid_table (id INTEGER PRIMARY KEY);')

    runFileBasedMigrations({
      database: db,
      migrationsTable: 'schema_migrations',
      migrationsDir,
      dbLabel: 'test',
    })

    const versions = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]
    expect(versions).toHaveLength(1)
    expect(versions[0].version).toBe(2)
  })

  it('should handle empty migrations directory', () => {
    runFileBasedMigrations({
      database: db,
      migrationsTable: 'schema_migrations',
      migrationsDir,
      dbLabel: 'test',
    })

    const versions = db.prepare('SELECT version FROM schema_migrations').all()
    expect(versions).toHaveLength(0)
  })

  it('should handle missing migrations directory gracefully', () => {
    expect(() =>
      runFileBasedMigrations({
        database: db,
        migrationsTable: 'schema_migrations',
        migrationsDir: '/nonexistent/path/to/migrations',
        dbLabel: 'test',
      })
    ).not.toThrow()
  })

  it('should work with different migration table names', () => {
    writeFileSync(join(migrationsDir, '002_init.sql'), 'CREATE TABLE test_data (id INTEGER PRIMARY KEY);')

    runFileBasedMigrations({
      database: db,
      migrationsTable: 'scout9_schema_migrations',
      migrationsDir,
      dbLabel: 'agents',
    })

    const versions = db.prepare('SELECT version FROM scout9_schema_migrations').all() as { version: number }[]
    expect(versions).toHaveLength(1)
  })
})

describe('seedMigrationsFromSchema', () => {
  let db: Database.Database
  let migrationsDir: string

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    migrationsDir = mkdtempSync(join(tmpdir(), 'seed-test-'))
  })

  afterEach(() => {
    db.close()
  })

  it('should seed all migration file versions into the tracking table', () => {
    writeFileSync(join(migrationsDir, '002_first.sql'), 'SELECT 1;')
    writeFileSync(join(migrationsDir, '003_second.sql'), 'SELECT 1;')
    writeFileSync(join(migrationsDir, '004_third.sql'), 'SELECT 1;')

    seedMigrationsFromSchema(db, 'schema_migrations', migrationsDir)

    const versions = db.prepare('SELECT version, name FROM schema_migrations ORDER BY version').all() as { version: number; name: string }[]
    expect(versions).toEqual([
      { version: 2, name: 'first' },
      { version: 3, name: 'second' },
      { version: 4, name: 'third' },
    ])
  })

  it('should not overwrite existing migration records', () => {
    db.prepare("INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema')").run()
    writeFileSync(join(migrationsDir, '002_first.sql'), 'SELECT 1;')

    seedMigrationsFromSchema(db, 'schema_migrations', migrationsDir)

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    expect(versions.map(v => v.version)).toEqual([1, 2])
  })

  it('should handle missing migrations directory gracefully', () => {
    expect(() =>
      seedMigrationsFromSchema(db, 'schema_migrations', '/nonexistent/path')
    ).not.toThrow()
  })
})
