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
  filterCoes: string[]
  filterPractices: string[]
  filterSkills: string[]
  criteriaFilter: StalledCriterionKey[]
  filterActors: CriterionActor[]
  filterHealthStatus: 'all' | 'flagged' | 'healthy'
  filterPositionStatuses: string[]
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
  const [filterCoes, setFilterCoes] = useState<string[]>(persisted.current.filterCoes ?? [])
  const [filterPractices, setFilterPractices] = useState<string[]>(persisted.current.filterPractices ?? [])
  const [filterSkills, setFilterSkills] = useState<string[]>(persisted.current.filterSkills ?? [])
  const [criteriaFilter, setCriteriaFilter] = useState<StalledCriterionKey[]>(persisted.current.criteriaFilter ?? [])
  const [filterActors, setFilterActors] = useState<CriterionActor[]>(persisted.current.filterActors ?? [])
  const [filterHealthStatus, setFilterHealthStatus] = useState<'all' | 'flagged' | 'healthy'>(persisted.current.filterHealthStatus ?? 'all')
  const [filterPositionStatuses, setFilterPositionStatuses] = useState<string[]>(persisted.current.filterPositionStatuses ?? [])
  const [sortOrder, setSortOrder] = useState<'aging-desc' | 'aging-asc'>(persisted.current.sortOrder ?? 'aging-desc')

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      searchText, filterCoes, filterPractices, filterSkills, criteriaFilter, filterActors, filterHealthStatus, filterPositionStatuses, sortOrder,
    }))
  }, [searchText, filterCoes, filterPractices, filterSkills, criteriaFilter, filterActors, filterHealthStatus, filterPositionStatuses, sortOrder])

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
  }), [results])

  const availableCoes = useMemo(() => {
    let base = results
    if (criteriaFilter.length > 0) {
      base = base.filter(r => r.matchingCriteria.some(c => criteriaFilter.includes(c)))
    }
    return [...new Set(base.map(r => r.position.coe).filter(Boolean))].sort()
  }, [results, criteriaFilter])

  const availablePractices = useMemo(() => {
    let base = results
    if (criteriaFilter.length > 0) {
      base = base.filter(r => r.matchingCriteria.some(c => criteriaFilter.includes(c)))
    }
    const withCoe = filterCoes.length > 0 ? base.filter(r => filterCoes.includes(r.position.coe)) : base
    return [...new Set(withCoe.map(r => r.position.practice).filter(Boolean))].sort()
  }, [results, criteriaFilter, filterCoes])

  const availableSkills = useMemo(() => {
    let base = results
    if (criteriaFilter.length > 0) {
      base = base.filter(r => r.matchingCriteria.some(c => criteriaFilter.includes(c)))
    }
    const withCoe = filterCoes.length > 0 ? base.filter(r => filterCoes.includes(r.position.coe)) : base
    const withPractice = filterPractices.length > 0 ? withCoe.filter(r => filterPractices.includes(r.position.practice)) : withCoe
    return [...new Set(withPractice.map(r => r.position.main_skill).filter(Boolean))].sort()
  }, [results, criteriaFilter, filterCoes, filterPractices])

  const availablePositionStatuses = useMemo(() => {
    return [...new Set(results.map(r => r.position.position_status).filter(Boolean))].sort()
  }, [results])

  const hasActiveFilters = useMemo(() => {
    return searchText.trim() !== '' ||
      criteriaFilter.length > 0 ||
      filterActors.length > 0 ||
      filterHealthStatus !== 'all' ||
      filterPositionStatuses.length > 0 ||
      filterCoes.length > 0 ||
      filterPractices.length > 0 ||
      filterSkills.length > 0
  }, [searchText, criteriaFilter, filterActors, filterHealthStatus, filterPositionStatuses, filterCoes, filterPractices, filterSkills])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (criteriaFilter.length > 0) count++
    if (filterActors.length > 0) count++
    if (filterPositionStatuses.length > 0) count++
    if (filterCoes.length > 0) count++
    if (filterPractices.length > 0) count++
    if (filterSkills.length > 0) count++
    if (filterHealthStatus !== 'all') count++
    if (searchText.trim()) count++
    return count
  }, [criteriaFilter, filterActors, filterPositionStatuses, filterCoes, filterPractices, filterSkills, filterHealthStatus, searchText])

  const clearAllFilters = useCallback(() => {
    setSearchText('')
    setCriteriaFilter([])
    setFilterActors([])
    setFilterHealthStatus('all')
    setFilterPositionStatuses([])
    setFilterCoes([])
    setFilterPractices([])
    setFilterSkills([])
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
    if (filterCoes.length > 0) {
      filtered = filtered.filter(r => filterCoes.includes(r.position.coe))
    }
    if (filterPractices.length > 0) {
      filtered = filtered.filter(r => filterPractices.includes(r.position.practice))
    }
    if (filterSkills.length > 0) {
      filtered = filtered.filter(r => filterSkills.includes(r.position.main_skill))
    }
    if (filterPositionStatuses.length > 0) {
      filtered = filtered.filter(r => filterPositionStatuses.includes(r.position.position_status))
    }

    return [...filtered].sort((a, b) =>
      sortOrder === 'aging-desc'
        ? b.position.aging - a.position.aging
        : a.position.aging - b.position.aging
    )
  }, [results, searchText, criteriaFilter, filterActors, filterHealthStatus, filterCoes, filterPractices, filterSkills, filterPositionStatuses, sortOrder])

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
    filterCoes,
    setFilterCoes,
    filterPractices,
    setFilterPractices,
    filterSkills,
    setFilterSkills,
    criteriaFilter,
    setCriteriaFilter,
    filterActors,
    setFilterActors,
    filterHealthStatus,
    setFilterHealthStatus,
    sortOrder,
    setSortOrder,
    availableCoes,
    availablePractices,
    availableSkills,
    availablePositionStatuses,
    filterPositionStatuses,
    setFilterPositionStatuses,
    hasActiveFilters,
    activeFilterCount,
    clearAllFilters,
    exportCsv,
    evaluate,
  }
}
