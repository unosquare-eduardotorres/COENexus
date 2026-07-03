import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { reportService } from '../services/reportService'
import {
  type StalledCriterionKey,
  type StalledThresholds,
  type StalledPositionResult,
  type CriterionActor,
  CRITERIA_CONFIG,
  DEFAULT_THRESHOLDS,
} from '../types'

const THRESHOLDS_STORAGE_KEY = 'core-stalled-thresholds'
const FILTER_STORAGE_KEY = 'core-op-report-filters'

export const COLUMN_VALUE_EXTRACTORS: Record<string, (r: StalledPositionResult) => string> = {
  account: r => r.position.account || '',
  status: r => r.position.position_status || '',
  stakeholder: r => r.position.stakeholder || '',
  coe: r => r.position.coe || '',
  practice: r => r.position.practice || '',
  main_skill: r => r.position.main_skill || '',
  vertical: r => r.position.vertical_industry || '',
  action_needed: r => r.actors.sort().join(', ') || '—',
  criteria: r => r.matchingCriteria.length === 0 ? 'Healthy' : r.matchingCriteria.sort().join(', '),
  job_title: r => r.position.job_title || '',
  countries: r => r.position.countries || '',
  seniorities: r => r.position.seniorities || '',
  sourcing: r => r.position.sourcing || '',
}

function loadThresholds(): StalledThresholds {
  try {
    const stored = localStorage.getItem(THRESHOLDS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* use defaults */ }
  return { ...DEFAULT_THRESHOLDS }
}

function saveThresholds(t: StalledThresholds): void {
  localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(t))
}

interface FilterState {
  searchText: string
  columnFilters: Record<string, string[]>
  criteriaFilter: StalledCriterionKey[]
  filterActors: CriterionActor[]
  filterHealthStatus: 'all' | 'flagged' | 'healthy' | 'external'
  sortOrder: 'aging-desc' | 'aging-asc'
}

function loadFilters(): Partial<FilterState> {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* use defaults */ }
  return {}
}

export function useOpenPositionReport() {
  const [thresholds, setThresholds] = useState<StalledThresholds>(loadThresholds)
  const [draftThresholds, setDraftThresholds] = useState<StalledThresholds>(loadThresholds)
  const [results, setResults] = useState<StalledPositionResult[]>([])
  const [totalPositions, setTotalPositions] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState<boolean | null>(null)

  const persisted = useRef(loadFilters())
  const [searchText, setSearchText] = useState(persisted.current.searchText ?? '')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(persisted.current.columnFilters ?? {})
  const [criteriaFilter, setCriteriaFilter] = useState<StalledCriterionKey[]>(persisted.current.criteriaFilter ?? [])
  const [filterActors, setFilterActors] = useState<CriterionActor[]>(persisted.current.filterActors ?? [])
  const [filterHealthStatus, setFilterHealthStatus] = useState<'all' | 'flagged' | 'healthy' | 'external'>(persisted.current.filterHealthStatus ?? 'all')
  const [sortOrder, setSortOrder] = useState<'aging-desc' | 'aging-asc'>(persisted.current.sortOrder ?? 'aging-desc')

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      searchText, columnFilters, criteriaFilter, filterActors, filterHealthStatus, sortOrder,
    }))
  }, [searchText, columnFilters, criteriaFilter, filterActors, filterHealthStatus, sortOrder])

  const checkSyncStatus = useCallback(async () => {
    try {
      const status = await reportService.getSyncStatus()
      setHasData(status.total > 0)
      setLastSyncedAt(status.lastSyncedAt)
    } catch {
      setHasData(false)
    }
  }, [])

  useEffect(() => { checkSyncStatus() }, [checkSyncStatus])

  const evaluate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await reportService.evaluatePositions(thresholds)
      setResults(result.results)
      setTotalPositions(result.totalPositions)
      setLastSyncedAt(result.lastSyncedAt)
      setHasData(result.totalPositions > 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setIsLoading(false)
    }
  }, [thresholds])

  useEffect(() => {
    if (hasData) evaluate()
  }, [hasData, evaluate])

  const applyThresholds = useCallback(() => {
    setThresholds({ ...draftThresholds })
    saveThresholds(draftThresholds)
    return true
  }, [draftThresholds])

  const resetDraftThresholds = useCallback(() => {
    setDraftThresholds({ ...thresholds })
  }, [thresholds])

  const setDraftThreshold = useCallback((key: StalledCriterionKey, value: number) => {
    setDraftThresholds(prev => ({ ...prev, [key]: value }))
  }, [])

  const criteriaFilterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const config of CRITERIA_CONFIG) {
      counts[config.key] = results.filter(r => r.matchingCriteria.includes(config.key)).length
    }
    return counts
  }, [results])

  const healthCounts = useMemo(() => ({
    healthy: results.filter(r => r.matchingCriteria.length === 0).length,
    flagged: results.filter(r => r.matchingCriteria.length > 0).length,
    external: results.filter(r => r.position.vertical_industry.trim() !== '').length,
  }), [results])

  const availableColumnValues = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const [key, extractor] of Object.entries(COLUMN_VALUE_EXTRACTORS)) {
      const values = [...new Set(results.map(extractor).filter(Boolean))].sort()
      map[key] = values
    }
    return map
  }, [results])

  const setColumnFilter = useCallback((colKey: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [colKey]: values }))
  }, [])

  const clearColumnFilter = useCallback((colKey: string) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      delete next[colKey]
      return next
    })
  }, [])

  const hasActiveFilters = useMemo(() => {
    return searchText.trim() !== '' ||
      criteriaFilter.length > 0 ||
      filterActors.length > 0 ||
      filterHealthStatus !== 'all' ||
      Object.keys(columnFilters).length > 0
  }, [searchText, criteriaFilter, filterActors, filterHealthStatus, columnFilters])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (criteriaFilter.length > 0) count++
    if (filterActors.length > 0) count++
    if (filterHealthStatus !== 'all') count++
    if (searchText.trim()) count++
    count += Object.keys(columnFilters).length
    return count
  }, [criteriaFilter, filterActors, filterHealthStatus, searchText, columnFilters])

  const clearAllFilters = useCallback(() => {
    setSearchText('')
    setCriteriaFilter([])
    setFilterActors([])
    setFilterHealthStatus('all')
    setColumnFilters({})
  }, [])

  const filteredResults = useMemo(() => {
    let filtered = results

    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase()
      filtered = filtered.filter(r => {
        const p = r.position
        return (
          String(p.upstream_id).includes(lower) ||
          p.account.toLowerCase().includes(lower) ||
          p.stakeholder.toLowerCase().includes(lower) ||
          p.coe.toLowerCase().includes(lower) ||
          p.practice.toLowerCase().includes(lower) ||
          p.main_skill.toLowerCase().includes(lower)
        )
      })
    }

    if (filterHealthStatus === 'healthy') {
      filtered = filtered.filter(r => r.matchingCriteria.length === 0)
    } else if (filterHealthStatus === 'flagged') {
      filtered = filtered.filter(r => r.matchingCriteria.length > 0)
    } else if (filterHealthStatus === 'external') {
      filtered = filtered.filter(r => r.position.vertical_industry.trim() !== '')
    }

    if (criteriaFilter.length > 0) {
      filtered = filtered.filter(r =>
        r.matchingCriteria.some(c => criteriaFilter.includes(c))
      )
    }
    if (filterActors.length > 0) {
      filtered = filtered.filter(r =>
        r.actors.some(a => filterActors.includes(a))
      )
    }

    for (const [colKey, selectedValues] of Object.entries(columnFilters)) {
      const extractor = COLUMN_VALUE_EXTRACTORS[colKey]
      if (!extractor) continue
      const available = availableColumnValues[colKey] ?? []
      if (selectedValues.length === available.length) continue
      filtered = filtered.filter(r => selectedValues.includes(extractor(r)))
    }

    return [...filtered].sort((a, b) =>
      sortOrder === 'aging-desc'
        ? b.position.aging - a.position.aging
        : a.position.aging - b.position.aging
    )
  }, [results, searchText, criteriaFilter, filterActors, filterHealthStatus, columnFilters, availableColumnValues, sortOrder])

  const exportCsv = useCallback(async () => {
    return reportService.exportXlsx(filteredResults)
  }, [filteredResults])

  return {
    isLoading,
    error,
    hasData,
    results,
    filteredResults,
    totalPositions,
    lastSyncedAt,
    thresholds,
    draftThresholds,
    setDraftThreshold,
    applyThresholds,
    resetDraftThresholds,
    criteriaFilterCounts,
    healthCounts,
    searchText,
    setSearchText,
    columnFilters,
    setColumnFilter,
    clearColumnFilter,
    availableColumnValues,
    criteriaFilter,
    setCriteriaFilter,
    filterActors,
    setFilterActors,
    filterHealthStatus,
    setFilterHealthStatus,
    sortOrder,
    setSortOrder,
    hasActiveFilters,
    activeFilterCount,
    clearAllFilters,
    exportCsv,
    evaluate,
  }
}
