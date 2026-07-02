import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { prrService } from '../services/prrService'
import type { PrrReportItem, PrrCoeStatus } from '../types'
import { useMultiFilter, type FilterDimension } from './useMultiFilter'

const FILTER_STORAGE_KEY = 'prr-report-filters'

type SortKey = 'employee' | 'account' | 'team' | 'mainSkill' | 'seniority' | 'transitionStatus' | 'coeStatus' | 'location' | 'daysOpened'
type SortDirection = 'asc' | 'desc'

interface FilterState {
  searchText?: string
  filterTeams?: string[]
  filterSkills?: string[]
  filterSeniorities?: string[]
  filterPrrStatuses?: string[]
  filterCoeStatuses?: PrrCoeStatus[]
  filterLocations?: string[]
  sortKey?: SortKey
  sortDirection?: SortDirection
}

function loadFilters(): FilterState {
  try {
    const raw = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function getComparableValue(item: PrrReportItem, key: SortKey): string | number {
  switch (key) {
    case 'employee': return item.employee
    case 'account': return item.account
    case 'team': return item.team
    case 'mainSkill': return item.mainSkill
    case 'seniority': return item.seniority
    case 'transitionStatus': return item.transitionStatus
    case 'coeStatus': return item.coeStatus
    case 'location': return item.location
    case 'daysOpened': return item.daysOpened
    default: return ''
  }
}

const DIMENSIONS: FilterDimension<PrrReportItem>[] = [
  { key: 'teams', accessor: item => item.team },
  { key: 'skills', accessor: item => item.mainSkill },
  { key: 'seniorities', accessor: item => item.seniority },
  { key: 'prrStatuses', accessor: item => item.transitionStatus },
  { key: 'coeStatuses', accessor: item => item.coeStatus },
  { key: 'locations', accessor: item => item.location },
]

export function usePrrReport() {
  const [results, setResults] = useState<PrrReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState<boolean | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const persisted = useRef(loadFilters())
  const [searchText, setSearchText] = useState(persisted.current.searchText ?? '')
  const [sortKey, setSortKey] = useState<SortKey>(persisted.current.sortKey ?? 'daysOpened')
  const [sortDirection, setSortDirection] = useState<SortDirection>(persisted.current.sortDirection ?? 'desc')

  // Build dimension definitions with persisted initial values
  const dimensionsWithInitial = useMemo(() => {
    const p = persisted.current
    const initialMap: Record<string, string[] | undefined> = {
      teams: p.filterTeams,
      skills: p.filterSkills,
      seniorities: p.filterSeniorities,
      prrStatuses: p.filterPrrStatuses,
      coeStatuses: p.filterCoeStatuses,
      locations: p.filterLocations,
    }
    return DIMENSIONS.map(dim => ({
      ...dim,
      initial: initialMap[dim.key],
    }))
  }, [])

  const searchPredicate = useCallback((item: PrrReportItem) => {
    if (!searchText.trim()) return true
    const term = searchText.trim().toLowerCase()
    return item.employee.toLowerCase().includes(term) || item.account.toLowerCase().includes(term)
  }, [searchText])

  const filters = useMultiFilter({
    items: results,
    dimensions: dimensionsWithInitial,
    preFilter: searchPredicate,
  })

  // Persist filter state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        searchText,
        filterTeams: filters.filterState.teams,
        filterSkills: filters.filterState.skills,
        filterSeniorities: filters.filterState.seniorities,
        filterPrrStatuses: filters.filterState.prrStatuses,
        filterCoeStatuses: filters.filterState.coeStatuses as PrrCoeStatus[],
        filterLocations: filters.filterState.locations,
        sortKey,
        sortDirection,
      } satisfies FilterState)
    )
  }, [searchText, filters.filterState, sortKey, sortDirection])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await prrService.getAll()
      setResults(items)
      setHasData(items.length > 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PRR report data')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateCoeStatus = useCallback(async (upstreamId: number, coeStatus: PrrCoeStatus) => {
    await prrService.updateCoeStatus(upstreamId, coeStatus)
    setResults(prev => prev.map(item => (item.upstreamId === upstreamId ? { ...item, coeStatus } : item)))
  }, [])

  const deleteRecord = useCallback(async (upstreamId: number) => {
    await prrService.delete(upstreamId)
    setResults(prev => {
      const next = prev.filter(item => item.upstreamId !== upstreamId)
      setHasData(next.length > 0)
      return next
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    const initialize = async () => {
      try {
        const status = await prrService.getSyncStatus()
        if (!isMounted) return
        setHasData(status.total > 0)
        setLastSyncedAt(status.lastSyncedAt)
        if (status.total > 0) {
          await loadData()
        }
      } catch {
        if (!isMounted) return
        setHasData(false)
      }
    }
    void initialize()
    return () => { isMounted = false }
  }, [loadData])

  const filteredResults = useMemo(() => {
    return [...filters.filteredItems].sort((a, b) => {
      const aValue = getComparableValue(a, sortKey)
      const bValue = getComparableValue(b, sortKey)
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      const result = compareStrings(String(aValue), String(bValue))
      return sortDirection === 'asc' ? result : -result
    })
  }, [filters.filteredItems, sortKey, sortDirection])

  const hasActiveFilters = useMemo(() => {
    return searchText.trim().length > 0 || filters.hasActiveFilters
  }, [searchText, filters.hasActiveFilters])

  const activeFilterCount = useMemo(() => {
    return (searchText.trim() ? 1 : 0) + filters.activeFilterCount
  }, [searchText, filters.activeFilterCount])

  const clearAllFilters = useCallback(() => {
    setSearchText('')
    filters.clearAll()
  }, [filters.clearAll])

  // Convenience accessors for backward-compatible API
  const dim = filters.dimensionStates

  return {
    results,
    isLoading,
    error,
    hasData,
    lastSyncedAt,
    searchText,
    setSearchText,
    filterTeams: dim.teams?.selected ?? [],
    setFilterTeams: dim.teams?.set ?? (() => {}),
    filterSkills: dim.skills?.selected ?? [],
    setFilterSkills: dim.skills?.set ?? (() => {}),
    filterSeniorities: dim.seniorities?.selected ?? [],
    setFilterSeniorities: dim.seniorities?.set ?? (() => {}),
    filterPrrStatuses: dim.prrStatuses?.selected ?? [],
    setFilterPrrStatuses: dim.prrStatuses?.set ?? (() => {}),
    filterCoeStatuses: (dim.coeStatuses?.selected ?? []) as PrrCoeStatus[],
    setFilterCoeStatuses: dim.coeStatuses?.set as unknown as (values: PrrCoeStatus[]) => void ?? (() => {}),
    filterLocations: dim.locations?.selected ?? [],
    setFilterLocations: dim.locations?.set ?? (() => {}),
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    availableTeams: dim.teams?.available ?? [],
    availableSkills: dim.skills?.available ?? [],
    availableSeniorities: dim.seniorities?.available ?? [],
    availablePrrStatuses: dim.prrStatuses?.available ?? [],
    availableCoeStatuses: (dim.coeStatuses?.available ?? []) as PrrCoeStatus[],
    availableLocations: dim.locations?.available ?? [],
    filteredResults,
    hasActiveFilters,
    activeFilterCount,
    clearAllFilters,
    loadData,
    updateCoeStatus,
    deleteRecord,
  }
}
