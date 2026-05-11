import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function createInMemoryDb(): Database.Database {
  return new Database(':memory:')
}

export function createAgentsDb(): Database.Database {
  const db = createInMemoryDb()
  const schemaPath = join(__dirname, '../../src/main/db/agents/schema.sql')
  const schemaSql = readFileSync(schemaPath, 'utf-8')
  db.exec(schemaSql)
  return db
}

export function createNexusDb(): Database.Database {
  const db = createInMemoryDb()
  const schemaPath = join(__dirname, '../../src/main/db/schema.sql')
  const schemaSql = readFileSync(schemaPath, 'utf-8')
  const safeSql = stripVecExtensions(schemaSql)
  db.exec(safeSql)
  return db
}

export function createPathDb(): Database.Database {
  const db = createInMemoryDb()
  const schemaPath = join(__dirname, '../../src/main/db/path/schema.sql')
  const schemaSql = readFileSync(schemaPath, 'utf-8')
  db.exec(schemaSql)
  return db
}

function stripVecExtensions(sql: string): string {
  return sql
    .split('\n')
    .filter(line => {
      const trimmed = line.trim().toLowerCase()
      return !trimmed.startsWith('create virtual table') || !trimmed.includes('vec0')
    })
    .join('\n')
}

export function seedRows(
  db: Database.Database,
  table: string,
  rows: Record<string, unknown>[]
): void {
  if (rows.length === 0) return
  const columns = Object.keys(rows[0])
  const placeholders = columns.map(c => `@${c}`).join(', ')
  const stmt = db.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
  )
  const insertMany = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) stmt.run(item)
  })
  insertMany(rows)
}
