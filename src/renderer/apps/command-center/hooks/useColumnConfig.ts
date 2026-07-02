import { useState, useCallback, useEffect, useMemo, useRef } from 'react'

interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
}

interface ColumnConfig {
  visible: string[]
  order: string[]
}

interface UseColumnConfigReturn {
  columnConfig: ColumnConfig
  visibleColumns: ColumnDef[]
  toggleColumn: (key: string) => void
  moveColumn: (key: string, direction: 'up' | 'down') => void
  resetColumns: () => void
  showColumnConfig: boolean
  setShowColumnConfig: (show: boolean) => void
  columnConfigRef: React.RefObject<HTMLDivElement | null>
}

export function useColumnConfig(columnDefs: ColumnDef[], storageKey: string): UseColumnConfigReturn {
  const columnConfigRef = useRef<HTMLDivElement>(null)
  const [showColumnConfig, setShowColumnConfig] = useState(false)

  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) return JSON.parse(stored)
    } catch { /* use defaults */ }
    const defaultVisible = columnDefs.filter(c => c.defaultVisible).map(c => c.key)
    return { visible: defaultVisible, order: columnDefs.map(c => c.key) }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnConfig))
  }, [columnConfig, storageKey])

  useEffect(() => {
    if (!showColumnConfig) return
    const handler = (e: MouseEvent) => {
      if (columnConfigRef.current && !columnConfigRef.current.contains(e.target as Node)) setShowColumnConfig(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnConfig])

  const visibleColumns = useMemo(() => {
    return columnConfig.order
      .filter(key => columnConfig.visible.includes(key))
      .map(key => columnDefs.find(c => c.key === key)!)
      .filter(Boolean)
  }, [columnConfig, columnDefs])

  const toggleColumn = useCallback((key: string) => {
    setColumnConfig(prev => ({
      ...prev,
      visible: prev.visible.includes(key)
        ? prev.visible.filter(k => k !== key)
        : [...prev.visible, key],
    }))
  }, [])

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnConfig(prev => {
      const order = [...prev.order]
      const idx = order.indexOf(key)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= order.length) return prev
      ;[order[idx], order[target]] = [order[target], order[idx]]
      return { ...prev, order }
    })
  }, [])

  const resetColumns = useCallback(() => {
    const defaultVisible = columnDefs.filter(c => c.defaultVisible).map(c => c.key)
    setColumnConfig({ visible: defaultVisible, order: columnDefs.map(c => c.key) })
  }, [columnDefs])

  return {
    columnConfig,
    visibleColumns,
    toggleColumn,
    moveColumn,
    resetColumns,
    showColumnConfig,
    setShowColumnConfig,
    columnConfigRef,
  }
}
