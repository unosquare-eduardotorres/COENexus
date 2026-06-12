import { createLogger } from '../logger'

const log = createLogger('UpstreamApiClient')

export interface PagedRequest {
  columns: ColumnDefinition[]
  searchText?: string
  skip: number
  take: number
  counter?: number
  timezoneOffset?: number
}

export interface PagedResponse {
  counter: number
  payload: unknown[][]
  filteredRecordCount: number
  totalPages: number
  currentPage: number
}

export interface ColumnDefinition {
  name: string
  label: string
  aggregate?: string
  dataType?: string
  dateDisplayFormat?: string
  dateOriginFormat?: string
  dateTimeDisplayFormat?: string
  dateTimeOriginFormat?: string
  isKey?: boolean
  isComputed?: boolean
  searchable?: boolean
  sortDirection?: string
  sortOrder?: number
  sortable?: boolean
  visible?: boolean
  filterOperator?: string
  filterText?: string
  filterable?: boolean
  exportable?: boolean
  filterArgument?: string[]
}

export async function fetchAuthorized<T>(method: string, url: string, token: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const start = Date.now()
  const options: RequestInit = {
    method,
    headers: {
      'x-sharepoint-token': token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  }

  const response = await fetch(url, options)
  if (!response.ok) {
    log.error(`Upstream API error: ${method} ${url}`, new Error(`${response.status} ${response.statusText}`), { status: response.status, method, durationMs: Date.now() - start })
    throw new Error(`Upstream API ${response.status}: ${response.statusText}`)
  }
  log.debug(`Upstream API OK: ${method} ${url}`, { status: response.status, durationMs: Date.now() - start })
  return response.json() as Promise<T>
}

export async function fetchPaged(url: string, token: string, request: PagedRequest, signal?: AbortSignal): Promise<PagedResponse> {
  const raw = await fetchAuthorized<Record<string, unknown>>('POST', url, token, request, signal)
  const payload = (raw.payload ?? raw.Payload) as unknown[][] | undefined
  if (!payload || !Array.isArray(payload)) {
    log.warn('Invalid paged response — token may be expired', { url, hasPayload: !!raw.payload || !!raw.Payload })
    throw new Error('Invalid API response — token may be expired or unauthorized')
  }
  return {
    counter: (raw.counter ?? raw.Counter ?? 0) as number,
    payload,
    filteredRecordCount: (raw.filteredRecordCount ?? raw.FilteredRecordCount ?? 0) as number,
    totalPages: (raw.totalPages ?? raw.TotalPages ?? 0) as number,
    currentPage: (raw.currentPage ?? raw.CurrentPage ?? 0) as number,
  }
}
