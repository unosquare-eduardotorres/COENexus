import { useEffect, useState } from 'react'
import type { CoeBonusFilters } from '../types/coeBonus'

interface LoaderState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Loads a slice of C.O.E. Bonus data and re-runs whenever the filters change.
 * Guards against out-of-order responses when the user changes filters quickly.
 */
export function useCoeBonusData<T>(
  loader: (filters: CoeBonusFilters) => Promise<T>,
  filters: CoeBonusFilters,
): LoaderState<T> {
  const [state, setState] = useState<LoaderState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState(prev => ({ data: prev.data, loading: true, error: null }))
    loader(filters)
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year, filters.quarter, filters.coe])

  return state
}
