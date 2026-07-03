export interface UpsertOptions {
  table: string
  columns: string[]
  conflictColumns: string[]
  updateColumns?: string[]
}

export function buildUpsertSql(opts: UpsertOptions): string {
  const { table, columns, conflictColumns } = opts
  const updateCols = opts.updateColumns ?? columns.filter(c => !conflictColumns.includes(c))

  const insertCols = columns.join(', ')
  const values = columns.map(c => `@${c}`).join(', ')
  const conflict = conflictColumns.join(', ')
  const updates = updateCols.map(c => `${c} = excluded.${c}`).join(', ')

  return `INSERT INTO ${table} (${insertCols}) VALUES (${values}) ON CONFLICT(${conflict}) DO UPDATE SET ${updates}`
}
