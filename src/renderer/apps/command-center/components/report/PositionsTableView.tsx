import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { COLUMN_VALUE_EXTRACTORS } from '../../hooks/useOpenPositionReport'
import { type StalledPositionResult } from '../../types'
import { SmallFilterIcon, CheckIcon } from '../Icons'

interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
  render: (r: StalledPositionResult) => ReactNode
}

// ─── Excel-style filter dropdown ───────────────────────────────────────────

interface ExcelFilterDropdownProps {
  columnKey: string
  allValues: string[]
  selectedValues: string[]
  isFiltered: boolean
  onChangeFilter: (colKey: string, values: string[]) => void
  onClearFilter: (colKey: string) => void
}

function ExcelFilterDropdown({ columnKey, allValues, selectedValues, isFiltered, onChangeFilter, onClearFilter }: ExcelFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const effectiveSelected = !isFiltered ? allValues : selectedValues
  const isAllSelected = effectiveSelected.length === allValues.length
  const isActive = isFiltered && !isAllSelected
  const filtered = allValues.filter(v => v.toLowerCase().includes(searchText.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) { setSearchText(''); return }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open])

  const toggleAll = () => {
    if (isAllSelected) {
      onChangeFilter(columnKey, [])
    } else {
      onClearFilter(columnKey)
    }
  }

  const toggleValue = (value: string) => {
    const current = new Set(effectiveSelected)
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    const arr = [...current]
    if (arr.length === allValues.length) {
      onClearFilter(columnKey)
    } else {
      onChangeFilter(columnKey, arr)
    }
  }

  if (allValues.length === 0) return null

  return (
    <div className="relative inline-flex" ref={triggerRef}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className={`p-0.5 rounded transition-colors ${
          isActive
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-muted/50 hover:text-muted'
        }`}
        title={`Filter ${columnKey}`}
      >
        <SmallFilterIcon active={isActive} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-[9999] w-60 glass-panel border border-white/10 rounded-lg shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-1.5 border-b border-white/5">
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search..."
              className="glass-input w-full text-sm py-1.5 px-2"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <button
              onClick={toggleAll}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors hover:bg-white/5"
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                isAllSelected
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-white/15 text-transparent'
              }`}>
                {isAllSelected && <CheckIcon />}
              </span>
              <span className="text-sm text-primary font-medium">Select All ({allValues.length})</span>
            </button>
            <div className="my-0.5 border-b border-white/5" />
            {filtered.length === 0 && <p className="text-xs text-muted px-2 py-1">No matches</p>}
            {filtered.map(value => {
              const checked = effectiveSelected.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleValue(value)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors hover:bg-white/5"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    checked
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'border-white/15 text-transparent'
                  }`}>
                    {checked && <CheckIcon />}
                  </span>
                  <span className={`truncate text-sm ${checked ? 'text-secondary' : 'text-muted'}`}>{value}</span>
                </button>
              )
            })}
          </div>
          {isActive && (
            <div className="border-t border-white/5 p-1.5">
              <button
                onClick={() => { onClearFilter(columnKey); setOpen(false) }}
                className="w-full text-center text-[10px] text-red-400 hover:text-red-300 py-1 transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Table View ────────────────────────────────────────────────────────────

interface PositionsTableViewProps {
  visibleColumns: ColumnDef[]
  filteredResults: StalledPositionResult[]
  availableColumnValues: Record<string, string[]>
  columnFilters: Record<string, string[]>
  onSetColumnFilter: (col: string, values: string[]) => void
  onClearColumnFilter: (col: string) => void
  onSelectPosition: (upstreamId: number) => void
}

export default function PositionsTableView({
  visibleColumns,
  filteredResults,
  availableColumnValues,
  columnFilters,
  onSetColumnFilter,
  onClearColumnFilter,
  onSelectPosition,
}: PositionsTableViewProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur">
          <tr className="border-b border-white/10">
            {visibleColumns.map(col => (
              <th key={col.key} className="text-left text-sm font-bold uppercase tracking-wider text-muted px-3 py-3 first:pl-4 last:pr-4">
                <div className="flex items-center gap-1">
                  {col.label}
                  {COLUMN_VALUE_EXTRACTORS[col.key] && (
                    <ExcelFilterDropdown
                      columnKey={col.key}
                      allValues={availableColumnValues[col.key] ?? []}
                      selectedValues={columnFilters[col.key] ?? []}
                      isFiltered={columnFilters[col.key] !== undefined}
                      onChangeFilter={onSetColumnFilter}
                      onClearFilter={onClearColumnFilter}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredResults.length > 0 ? (
            filteredResults.map((r, i) => (
              <tr
                key={r.position.upstream_id}
                className={`border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                onClick={() => onSelectPosition(r.position.upstream_id)}
              >
                {visibleColumns.map(col => (
                  <td key={col.key} className="px-3 py-2.5 first:pl-4 last:pr-4">
                    {col.render(r)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-sm text-muted">
                No positions match the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
