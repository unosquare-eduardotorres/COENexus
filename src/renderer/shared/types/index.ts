/**
 * Shared types used across multiple sub-applications.
 *
 * Sub-apps should import these base types and extend or re-export as needed.
 * Domain-specific types remain in each app's own types/index.ts.
 */

/** Entity with a string identifier */
export interface WithId {
  id: string
}

/** Entity with ISO timestamp tracking */
export interface WithTimestamps {
  createdAt: string
  updatedAt?: string
}

/** Paginated result wrapper — use with any list endpoint */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Page request parameters */
export interface PageParams {
  page: number
  pageSize: number
}

/** Generic status for async pipeline operations */
export type AsyncOperationStatus = 'idle' | 'loading' | 'success' | 'error'

/** Date range filter — used in reports and sync operations */
export interface DateRange {
  from: string
  to: string
}

/** Upstream reference to HR system entity */
export interface UpstreamRef {
  upstreamId: number
  name: string
}

/** Employee reference used across match, command-center, and path apps */
export interface EmployeeRef {
  upstreamId: number
  fullName: string
  mainSkill: string
  seniority: string
  country: string
}

/** IPC error shape returned by wrapIpcHandler */
export interface IpcErrorResult {
  __ipcError: true
  message: string
  channel: string
}

/** Type guard for IPC error responses */
export function isIpcError(value: unknown): value is IpcErrorResult {
  return typeof value === 'object' && value !== null && '__ipcError' in value && (value as IpcErrorResult).__ipcError === true
}
