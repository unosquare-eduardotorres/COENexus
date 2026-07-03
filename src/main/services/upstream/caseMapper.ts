function toCamelCase(key: string): string {
  return key.charAt(0).toLowerCase() + key.slice(1)
}

export function mapKeysToCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    result[toCamelCase(key)] = obj[key]
  }
  return result as T
}
