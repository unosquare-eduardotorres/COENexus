import { useState, useCallback, useEffect, useRef } from 'react'

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

export default function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const toggle = useCallback((value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }, [onChange, selected])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) setFilterText('')
  }, [open])

  const filtered = options.filter(option => option.toLowerCase().includes(filterText.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all border ${
          selected.length > 0
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
        }`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 glass-panel border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-white/5">
            <input
              type="text"
              value={filterText}
              onChange={event => setFilterText(event.target.value)}
              placeholder="Search..."
              className="glass-input w-full text-xs py-1.5 px-2"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="text-xs text-muted px-2 py-1">No matches</p>}
            {filtered.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                  selected.includes(option) ? 'bg-emerald-500/15 text-emerald-400' : 'text-secondary hover:bg-white/5'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
