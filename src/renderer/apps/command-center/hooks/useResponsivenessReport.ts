import { useState, useEffect, useMemo, useCallback } from 'react'
import { responsivenessService } from '../services/responsivenessService'
import type {
  ResponsivenessReport,
  ResponsivenessUnansweredMention,
  ResponsivenessLeadSummary,
} from '../../../../shared/ipc-types'

type SortField = 'positionUpstreamId' | 'account' | 'coe' | 'mentionAuthorName' | 'taggedLeadName' | 'waitingDays'
type SortDir = 'asc' | 'desc'

interface ResponsivenessState {
  report: ResponsivenessReport | null
  loading: boolean
  error: string | null
  search: string
  leadFilter: string
  coeFilter: string
  sortField: SortField
  sortDir: SortDir
}

export function useResponsivenessReport() {
  const [state, setState] = useState<ResponsivenessState>({
    report: null,
    loading: true,
    error: null,
    search: '',
    leadFilter: 'all',
    coeFilter: 'all',
    sortField: 'waitingDays',
    sortDir: 'desc',
  })

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const report = await responsivenessService.getReport()
      setState(prev => ({ ...prev, report, loading: false }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load responsiveness report',
      }))
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const setSearch = useCallback((search: string) => {
    setState(prev => ({ ...prev, search }))
  }, [])

  const setLeadFilter = useCallback((leadFilter: string) => {
    setState(prev => ({ ...prev, leadFilter }))
  }, [])

  const setCoeFilter = useCallback((coeFilter: string) => {
    setState(prev => ({ ...prev, coeFilter }))
  }, [])

  const setSort = useCallback((field: SortField) => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === 'desc' ? 'asc' : 'desc',
    }))
  }, [])

  const filteredItems = useMemo((): ResponsivenessUnansweredMention[] => {
    if (!state.report) return []
    let items = [...state.report.items]

    // Filter by lead
    if (state.leadFilter !== 'all') {
      items = items.filter(i => i.taggedLeadEmail === state.leadFilter)
    }

    // Filter by COE
    if (state.coeFilter !== 'all') {
      items = items.filter(i => i.coe === state.coeFilter)
    }

    // Free-text search
    if (state.search.trim()) {
      const q = state.search.toLowerCase()
      items = items.filter(i =>
        i.account.toLowerCase().includes(q) ||
        i.mentionAuthorName.toLowerCase().includes(q) ||
        i.taggedLeadName.toLowerCase().includes(q) ||
        i.mentionMessage.toLowerCase().includes(q) ||
        i.coe.toLowerCase().includes(q) ||
        String(i.positionUpstreamId).includes(q)
      )
    }

    // Sort
    const dir = state.sortDir === 'asc' ? 1 : -1
    items.sort((a, b) => {
      const aVal = a[state.sortField]
      const bVal = b[state.sortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir
      return String(aVal).localeCompare(String(bVal)) * dir
    })

    return items
  }, [state.report, state.search, state.leadFilter, state.coeFilter, state.sortField, state.sortDir])

  // Derive unique filter options
  const filterOptions = useMemo(() => {
    if (!state.report) return { leads: [] as ResponsivenessLeadSummary[], coes: [] as string[] }
    const coes = [...new Set(state.report.items.map((i: ResponsivenessUnansweredMention) => i.coe).filter(Boolean))].sort()
    return { leads: state.report.leadSummary, coes }
  }, [state.report])

  return {
    report: state.report,
    loading: state.loading,
    error: state.error,
    search: state.search,
    leadFilter: state.leadFilter,
    coeFilter: state.coeFilter,
    sortField: state.sortField,
    sortDir: state.sortDir,
    filteredItems,
    filterOptions,
    setSearch,
    setLeadFilter,
    setCoeFilter,
    setSort,
    refresh: loadData,
  }
}
