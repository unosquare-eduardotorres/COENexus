import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { prrService } from '../services/prrService'
import type { PrrCoeStatus, PrrReportItem } from '../types'

const FILTER_STORAGE_KEY = 'core-prr-report-filters'

type SortKey = 'employee' | 'account' | 'team' | 'mainSkill' | 'seniority' | 'transitionStatus' | 'coeStatus' | 'location' | 'daysOpened'
type SortDirection = 'asc' | 'desc'

type FilterKey = 'teams' | 'skills' | 'seniorities' | 'prrStatuses' | 'coeStatuses' | 'locations'

interface FilterState {
  searchText: string
  filterTeams: string[]
  filterSkills: string[]
  filterSeniorities: string[]
  filterPrrStatuses: string[]
  filterCoeStatuses: PrrCoeStatus[]
  filterLocations: string[]
  sortKey: SortKey
  sortDirection: SortDirection
}

function loadFilters(): Partial<FilterState> {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Partial<FilterState>
    }
  } catch {
    return {}
  }

  return {}
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function getComparableValue(item: PrrReportItem, sortKey: SortKey): string | number {
  switch (sortKey) {
    case 'employee':
      return item.employee
    case 'account':
      return item.account
    case 'team':
      return item.team
    case 'mainSkill':
      return item.mainSkill
    case 'seniority':
      return item.seniority
    case 'transitionStatus':
      return item.transitionStatus
    case 'coeStatus':
      return item.coeStatus
    case 'location':
      return item.location
    case 'daysOpened':
    default:
      return item.daysOpened
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort(compareStrings)
}

export function usePrrReport() {
  const [results, setResults] = useState<PrrReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState<boolean | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const persisted = useRef(loadFilters())

  const [searchText, setSearchText] = useState(persisted.current.searchText ?? '')
  const [filterTeams, setFilterTeams] = useState<string[]>(persisted.current.filterTeams ?? [])
  const [filterSkills, setFilterSkills] = useState<string[]>(persisted.current.filterSkills ?? [])
  const [filterSeniorities, setFilterSeniorities] = useState<string[]>(persisted.current.filterSeniorities ?? [])
  const [filterPrrStatuses, setFilterPrrStatuses] = useState<string[]>(persisted.current.filterPrrStatuses ?? [])
  const [filterCoeStatuses, setFilterCoeStatuses] = useState<PrrCoeStatus[]>(persisted.current.filterCoeStatuses ?? [])
  const [filterLocations, setFilterLocations] = useState<string[]>(persisted.current.filterLocations ?? [])
  const [sortKey, setSortKey] = useState<SortKey>(persisted.current.sortKey ?? 'daysOpened')
  const [sortDirection, setSortDirection] = useState<SortDirection>(persisted.current.sortDirection ?? 'desc')

  useEffect(() => {
    sessionStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        searchText,
        filterTeams,
        filterSkills,
        filterSeniorities,
        filterPrrStatuses,
        filterCoeStatuses,
        filterLocations,
        sortKey,
        sortDirection,
      } satisfies FilterState)
    )
  }, [
    searchText,
    filterTeams,
    filterSkills,
    filterSeniorities,
    filterPrrStatuses,
    filterCoeStatuses,
    filterLocations,
    sortKey,
    sortDirection,
  ])

  const matchesSearch = useCallback((item: PrrReportItem) => {
    if (!searchText.trim()) return true
    const term = searchText.trim().toLowerCase()
    return item.employee.toLowerCase().includes(term) || item.account.toLowerCase().includes(term)
  }, [searchText])

  const applyFilters = useCallback((items: PrrReportItem[], exclude?: FilterKey) => {
    return items.filter(item => {
      if (!matchesSearch(item)) return false
      if (exclude !== 'teams' && filterTeams.length > 0 && !filterTeams.includes(item.team)) return false
      if (exclude !== 'skills' && filterSkills.length > 0 && !filterSkills.includes(item.mainSkill)) return false
      if (exclude !== 'seniorities' && filterSeniorities.length > 0 && !filterSeniorities.includes(item.seniority)) return false
      if (exclude !== 'prrStatuses' && filterPrrStatuses.length > 0 && !filterPrrStatuses.includes(item.transitionStatus)) return false
      if (exclude !== 'coeStatuses' && filterCoeStatuses.length > 0 && !filterCoeStatuses.includes(item.coeStatus)) return false
      if (exclude !== 'locations' && filterLocations.length > 0 && !filterLocations.includes(item.location)) return false
      return true
    })
  }, [matchesSearch, filterTeams, filterSkills, filterSeniorities, filterPrrStatuses, filterCoeStatuses, filterLocations])

  const availableTeams = useMemo(() => {
    return uniqueSorted(applyFilters(results, 'teams').map(item => item.team))
  }, [results, applyFilters])

  const availableSkills = useMemo(() => {
    return uniqueSorted(applyFilters(results, 'skills').map(item => item.mainSkill))
  }, [results, applyFilters])

  const availableSeniorities = useMemo(() => {
    return uniqueSorted(applyFilters(results, 'seniorities').map(item => item.seniority))
  }, [results, applyFilters])

  const availablePrrStatuses = useMemo(() => {
    return uniqueSorted(applyFilters(results, 'prrStatuses').map(item => item.transitionStatus))
  }, [results, applyFilters])

  const availableCoeStatuses = useMemo(() => {
    return [...new Set(applyFilters(results, 'coeStatuses').map(item => item.coeStatus))].sort(compareStrings) as PrrCoeStatus[]
  }, [results, applyFilters])

  const availableLocations = useMemo(() => {
    return uniqueSorted(applyFilters(results, 'locations').map(item => item.location))
  }, [results, applyFilters])

  useEffect(() => {
    setFilterTeams(prev => {
      const next = prev.filter(value => availableTeams.includes(value))
      return next.length === prev.length ? prev : next
    })
    setFilterSkills(prev => {
      const next = prev.filter(value => availableSkills.includes(value))
      return next.length === prev.length ? prev : next
    })
    setFilterSeniorities(prev => {
      const next = prev.filter(value => availableSeniorities.includes(value))
      return next.length === prev.length ? prev : next
    })
    setFilterPrrStatuses(prev => {
      const next = prev.filter(value => availablePrrStatuses.includes(value))
      return next.length === prev.length ? prev : next
    })
    setFilterCoeStatuses(prev => {
      const next = prev.filter(value => availableCoeStatuses.includes(value))
      return next.length === prev.length ? prev : next
    })
    setFilterLocations(prev => {
      const next = prev.filter(value => availableLocations.includes(value))
      return next.length === prev.length ? prev : next
    })
  }, [availableTeams, availableSkills, availableSeniorities, availablePrrStatuses, availableCoeStatuses, availableLocations])

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

    return () => {
      isMounted = false
    }
  }, [loadData])

  const filteredResults = useMemo(() => {
    const filtered = applyFilters(results)

    return [...filtered].sort((a, b) => {
      const aValue = getComparableValue(a, sortKey)
      const bValue = getComparableValue(b, sortKey)

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const result = compareStrings(String(aValue), String(bValue))
      return sortDirection === 'asc' ? result : -result
    })
  }, [results, applyFilters, sortKey, sortDirection])

  const hasActiveFilters = useMemo(() => {
    return (
      searchText.trim().length > 0 ||
      filterTeams.length > 0 ||
      filterSkills.length > 0 ||
      filterSeniorities.length > 0 ||
      filterPrrStatuses.length > 0 ||
      filterCoeStatuses.length > 0 ||
      filterLocations.length > 0
    )
  }, [
    searchText,
    filterTeams,
    filterSkills,
    filterSeniorities,
    filterPrrStatuses,
    filterCoeStatuses,
    filterLocations,
  ])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchText.trim()) count++
    if (filterTeams.length > 0) count++
    if (filterSkills.length > 0) count++
    if (filterSeniorities.length > 0) count++
    if (filterPrrStatuses.length > 0) count++
    if (filterCoeStatuses.length > 0) count++
    if (filterLocations.length > 0) count++
    return count
  }, [
    searchText,
    filterTeams,
    filterSkills,
    filterSeniorities,
    filterPrrStatuses,
    filterCoeStatuses,
    filterLocations,
  ])

  const clearAllFilters = useCallback(() => {
    setSearchText('')
    setFilterTeams([])
    setFilterSkills([])
    setFilterSeniorities([])
    setFilterPrrStatuses([])
    setFilterCoeStatuses([])
    setFilterLocations([])
  }, [])

  return {
    results,
    isLoading,
    error,
    hasData,
    lastSyncedAt,
    searchText,
    setSearchText,
    filterTeams,
    setFilterTeams,
    filterSkills,
    setFilterSkills,
    filterSeniorities,
    setFilterSeniorities,
    filterPrrStatuses,
    setFilterPrrStatuses,
    filterCoeStatuses,
    setFilterCoeStatuses,
    filterLocations,
    setFilterLocations,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    availableTeams,
    availableSkills,
    availableSeniorities,
    availablePrrStatuses,
    availableCoeStatuses,
    availableLocations,
    filteredResults,
    hasActiveFilters,
    activeFilterCount,
    clearAllFilters,
    loadData,
    updateCoeStatus,
    deleteRecord,
  }
}
