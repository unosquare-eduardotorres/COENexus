export function getString(row: unknown[], i: number): string {
  if (i >= row.length || row[i] == null) return ''
  return String(row[i])
}

export function getNullableString(row: unknown[], i: number): string | null {
  if (i >= row.length || row[i] == null) return null
  return String(row[i])
}

export function getInt(row: unknown[], i: number): number {
  if (i >= row.length || row[i] == null) return 0
  const val = Number(row[i])
  return isNaN(val) ? 0 : Math.floor(val)
}

export function getDecimal(row: unknown[], i: number): number {
  if (i >= row.length || row[i] == null) return 0
  const val = Number(row[i])
  return isNaN(val) ? 0 : val
}

export function getBool(row: unknown[], i: number): boolean {
  if (i >= row.length) return false
  const val = row[i]
  if (val === true) return true
  if (val === false) return false
  if (typeof val === 'string') {
    const lower = val.toLowerCase()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  return false
}

export function getDateTime(row: unknown[], i: number): string {
  if (i >= row.length || row[i] == null) return ''
  return String(row[i])
}

export function getNullableDateTime(row: unknown[], i: number): string | undefined {
  if (i >= row.length || row[i] == null) return undefined
  const val = String(row[i])
  return val || undefined
}
