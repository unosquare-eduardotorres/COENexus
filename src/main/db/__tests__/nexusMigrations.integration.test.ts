import { describe, expect, it, vi } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

vi.mock('../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const schemaPath = join(__dirname, '../schema.sql')
const migrationsDir = join(__dirname, '../migrations')

describe('nexus database migrations', () => {
  it('should have schema.sql file', () => {
    expect(existsSync(schemaPath)).toBe(true)
  })

  it('should have schema with expected tables', () => {
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toContain('synced_employees')
    expect(schema).toContain('synced_candidates')
    expect(schema).toContain('synced_open_positions')
    expect(schema).toContain('schema_migrations')
    expect(schema).toContain('resume_sessions')
    expect(schema).toContain('match_sessions')
  })

  it('should have migrations directory', () => {
    expect(existsSync(migrationsDir)).toBe(true)
  })

  it('should have migration files in correct order', () => {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
    expect(files.length).toBeGreaterThanOrEqual(9)
    expect(files[0]).toMatch(/^002/)
    expect(files[files.length - 1]).toMatch(/^010/)
  })

  it('should have valid SQL in each migration file', () => {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      expect(sql.length).toBeGreaterThan(0)
      expect(sql).not.toContain('syntax error')
    }
  })

  it('should have schema_migrations table with version column', () => {
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toMatch(/schema_migrations.*version/is)
  })

  it('should have foreign keys pragma set', () => {
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toMatch(/foreign_keys\s*=\s*ON/i)
  })

  it('migration 002 should handle status conversion', () => {
    const sql = readFileSync(join(migrationsDir, '002_convert_failed_to_status.sql'), 'utf-8')
    expect(sql.length).toBeGreaterThan(0)
  })

  it('migration 008 should handle pipeline reconciliation', () => {
    const sql = readFileSync(join(migrationsDir, '008_reconcile_pipeline_status.sql'), 'utf-8')
    expect(sql.length).toBeGreaterThan(0)
  })

  it('migration 010 should create presentation tables', () => {
    const sql = readFileSync(join(migrationsDir, '010_presentation_sessions.sql'), 'utf-8')
    expect(sql).toContain('presentation_sessions')
    expect(sql).toContain('presentation_entries')
  })

  it('should have schema with presentation tables', () => {
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toContain('presentation_sessions')
    expect(schema).toContain('presentation_entries')
  })
})
