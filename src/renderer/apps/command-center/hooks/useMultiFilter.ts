/**
 * Generic multi-dimensional filter hook.
 *
 * Manages N filter dimensions with persisted state, available-options computation,
 * cross-filter pruning, and clear-all functionality.
 *
 * Extracted from the repeated pattern in usePrrReport.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export interface FilterDimension<T> {
  /** Unique key for this filter dimension */
  key: string
  /** Accessor to get the filterable value from a data item */
  accessor: (item: T) => string
  /** Initial selected values (from persisted state) */
  initial?: string[]
}

interface UseMultiFilterOptions<T> {
  /** The full dataset to filter */
  items: T[]
  /** Filter dimension definitions */
  dimensions: FilterDimension<T>[]
  /** Additional predicate applied before dimension filters (e.g., search text match) */
  preFilter?: (item: T) => boolean
  /** Storage key for persisting filter state */
  storageKey?: string
}

interface DimensionState {
  selected: string[]
  available: string[]
  set: (values: string[]) => void
}

export function useMultiFilter<T>({ items, dimensions, preFilter }: UseMultiFilterOptions<T>) {
  // One state per dimension
  const [filterState, setFilterState] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const dim of dimensions) {
      initial[dim.key] = dim.initial ?? []
    }
    return initial
  })

  const setDimensionFilter = useCallback((key: string, values: string[]) => {
    setFilterState(prev => ({ ...prev, [key]: values }))
  }, [])

  // Apply all filters except one (for computing available options in that dimension)
  const applyFilters = useCallback((excludeKey?: string): T[] => {
    return items.filter(item => {
      if (preFilter && !preFilter(item)) return false
      for (const dim of dimensions) {
        if (dim.key === excludeKey) continue
        const selected = filterState[dim.key]
        if (selected && selected.length > 0 && !selected.includes(dim.accessor(item))) {
          return false
        }
      }
      return true
    })
  }, [items, dimensions, filterState, preFilter])

  // Compute available options per dimension (cross-filtered)
  const available = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const dim of dimensions) {
      result[dim.key] = uniqueSorted(
        applyFilters(dim.key).map(item => dim.accessor(item))
      )
    }
    return result
  }, [dimensions, applyFilters])

  // Prune stale filter values when available options change
  useEffect(() => {
    setFilterState(prev => {
      let changed = false
      const next = { ...prev }
      for (const dim of dimensions) {
        const avail = available[dim.key] ?? []
        const pruned = (prev[dim.key] ?? []).filter(v => avail.includes(v))
        if (pruned.length !== (prev[dim.key] ?? []).length) {
          next[dim.key] = pruned
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [available, dimensions])

  // Filtered results with all dimensions applied
  const filteredItems = useMemo(() => applyFilters(), [applyFilters])

  const hasActiveFilters = useMemo(() => {
    return dimensions.some(dim => (filterState[dim.key] ?? []).length > 0)
  }, [dimensions, filterState])

  const activeFilterCount = useMemo(() => {
    return dimensions.filter(dim => (filterState[dim.key] ?? []).length > 0).length
  }, [dimensions, filterState])

  const clearAll = useCallback(() => {
    const empty: Record<string, string[]> = {}
    for (const dim of dimensions) {
      empty[dim.key] = []
    }
    setFilterState(empty)
  }, [dimensions])

  // Build per-dimension state accessors
  const dimensionStates = useMemo(() => {
    const result: Record<string, DimensionState> = {}
    for (const dim of dimensions) {
      result[dim.key] = {
        selected: filterState[dim.key] ?? [],
        available: available[dim.key] ?? [],
        set: (values: string[]) => setDimensionFilter(dim.key, values),
      }
    }
    return result
  }, [dimensions, filterState, available, setDimensionFilter])

  return {
    filterState,
    setDimensionFilter,
    available,
    filteredItems,
    hasActiveFilters,
    activeFilterCount,
    clearAll,
    dimensionStates,
  }
}
