/**
 * Shared field-mapping utilities for entity builders (employee, candidate).
 * Reduces duplication of null/undefined fallback patterns and catalog lookups.
 */

/**
 * Looks up a catalog value by ID, falling back to a default if the catalog is empty or ID missing.
 */
export function resolveCatalogValue(
  catalogMap: Map<number, string>,
  id: number | null | undefined,
  fallback: string | null | undefined,
  defaultValue = 'Unknown',
): string {
  if (catalogMap.size > 0 && id && id > 0) {
    return catalogMap.get(id) ?? fallback ?? defaultValue
  }
  return fallback ?? defaultValue
}

/**
 * Validates required fields and returns status + reason.
 */
export function validateRecordFields(
  checks: Array<{ field: string; present: boolean }>,
): { status: 'synced' | 'incomplete'; statusReason: string | null } {
  const missingFields: string[] = []
  for (const { field, present } of checks) {
    if (!present) missingFields.push(field)
  }
  return {
    status: missingFields.length === 0 ? 'synced' : 'incomplete',
    statusReason: missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : null,
  }
}

/**
 * Safe string fallback — returns the first truthy value or the default.
 */
export function str(value: string | null | undefined, fallback = ''): string {
  return value || fallback
}
