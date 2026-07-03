import { describe, expect, it } from 'vitest'
import { buildUpsertSql } from './upsertBuilder'

describe('buildUpsertSql', () => {
  it('should generate upsert SQL for basic columns', () => {
    const sql = buildUpsertSql({
      table: 'users',
      columns: ['id', 'name', 'email'],
      conflictColumns: ['id'],
    })

    expect(sql).toBe(
      'INSERT INTO users (id, name, email) VALUES (@id, @name, @email) ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email'
    )
  })

  it('should handle composite conflict columns', () => {
    const sql = buildUpsertSql({
      table: 'scores',
      columns: ['user_id', 'test_id', 'score'],
      conflictColumns: ['user_id', 'test_id'],
    })

    expect(sql).toContain('ON CONFLICT(user_id, test_id)')
    expect(sql).toContain('DO UPDATE SET score = excluded.score')
  })

  it('should use explicit updateColumns when provided', () => {
    const sql = buildUpsertSql({
      table: 'items',
      columns: ['id', 'name', 'value', 'updated_at'],
      conflictColumns: ['id'],
      updateColumns: ['value'],
    })

    expect(sql).toContain('DO UPDATE SET value = excluded.value')
    expect(sql).not.toContain('name = excluded.name')
    expect(sql).not.toContain('updated_at = excluded.updated_at')
  })

  it('should handle single column table', () => {
    const sql = buildUpsertSql({
      table: 'keys',
      columns: ['key'],
      conflictColumns: ['key'],
    })

    expect(sql).toBe(
      'INSERT INTO keys (key) VALUES (@key) ON CONFLICT(key) DO UPDATE SET '
    )
  })
})
