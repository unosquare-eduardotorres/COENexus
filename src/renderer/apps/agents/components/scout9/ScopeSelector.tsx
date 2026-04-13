import { useState, useEffect } from 'react'
import { Filter } from 'lucide-react'

interface ScopePreset {
  name: string
  label: string
  count: number
}

interface ScopeSelectorProps {
  onSelect: (params: { preset?: string; filters?: { coe?: string[]; vertical?: string[]; client?: string[] } }) => void
  disabled?: boolean
}

export default function ScopeSelector({ onSelect, disabled }: ScopeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>('all-active')
  const [showCustom, setShowCustom] = useState(false)
  const [customFilters, setCustomFilters] = useState({ coe: '' as string, vertical: '' as string, client: '' as string })
  const [presets, setPresets] = useState<ScopePreset[]>([
    { name: 'all-active', label: 'All Active', count: 0 },
    { name: 'no-candidates', label: 'No Candidates', count: 0 },
    { name: 'stalled-30d', label: 'Stalled 30d+', count: 0 },
    { name: 'high-priority', label: 'High Priority', count: 0 },
  ])

  useEffect(() => {
    window.api?.scout9?.getScopeOptions?.().then((result: { success: boolean; data?: { presets: ScopePreset[] } }) => {
      if (result?.success && result.data?.presets) {
        setPresets(result.data.presets)
      }
    }).catch(() => {})
  }, [])

  function handlePresetClick(name: string) {
    if (name === 'custom') {
      setSelectedPreset(null)
      setShowCustom(true)
      return
    }
    setSelectedPreset(name)
    setShowCustom(false)
    onSelect({ preset: name })
  }

  function handleApplyCustom() {
    const filters: { coe?: string[]; vertical?: string[]; client?: string[] } = {}
    if (customFilters.coe) filters.coe = [customFilters.coe]
    if (customFilters.vertical) filters.vertical = [customFilters.vertical]
    if (customFilters.client) filters.client = [customFilters.client]
    onSelect({ filters })
  }

  function getScopeLabel(): string {
    if (selectedPreset) {
      return presets.find(p => p.name === selectedPreset)?.label ?? selectedPreset
    }
    return 'Custom'
  }

  function getScopeCount(): number {
    if (selectedPreset) {
      return presets.find(p => p.name === selectedPreset)?.count ?? 0
    }
    return 0
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted">
          <Filter size={12} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Scope</span>
        </div>

        {presets.map(p => (
          <button
            key={p.name}
            onClick={() => handlePresetClick(p.name)}
            disabled={disabled}
            className={`
              px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
              ${selectedPreset === p.name
                ? 'bg-white/10 border border-white/20 text-primary'
                : 'bg-transparent border border-white/5 text-muted hover:text-secondary hover:border-white/10'
              }
            `}
          >
            {p.label}
            {p.count > 0 && (
              <span className="ml-1 text-[9px] opacity-50">{p.count}</span>
            )}
            {selectedPreset === p.name && <span className="ml-1 text-[9px]">✓</span>}
          </button>
        ))}

        <button
          onClick={() => handlePresetClick('custom')}
          disabled={disabled}
          className={`
            px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
            ${showCustom && !selectedPreset
              ? 'bg-white/10 border border-white/20 text-primary'
              : 'bg-transparent border border-white/5 text-muted hover:text-secondary hover:border-white/10'
            }
          `}
        >
          Custom ▾
        </button>
      </div>

      {showCustom && !selectedPreset && (
        <div className="flex items-end gap-2 ml-6">
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider">COE</label>
            <input
              type="text"
              className="glass-input w-28 mt-0.5 px-2 py-1 text-xs"
              placeholder="e.g. COE-A"
              value={customFilters.coe}
              onChange={e => setCustomFilters(f => ({ ...f, coe: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider">Vertical</label>
            <input
              type="text"
              className="glass-input w-28 mt-0.5 px-2 py-1 text-xs"
              placeholder="e.g. FinTech"
              value={customFilters.vertical}
              onChange={e => setCustomFilters(f => ({ ...f, vertical: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider">Client</label>
            <input
              type="text"
              className="glass-input w-28 mt-0.5 px-2 py-1 text-xs"
              placeholder="e.g. Acme"
              value={customFilters.client}
              onChange={e => setCustomFilters(f => ({ ...f, client: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={disabled}
            className="glass-button px-3 py-1 text-xs font-semibold text-blue-400"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export function useScopeLabel(scopeParams: { preset?: string; filters?: Record<string, string[]> }): { label: string; details?: string } {
  if (scopeParams.preset) {
    const labels: Record<string, string> = {
      'all-active': 'All Active',
      'no-candidates': 'No Candidates',
      'stalled-30d': 'Stalled 30d+',
      'high-priority': 'High Priority',
    }
    return { label: labels[scopeParams.preset] ?? scopeParams.preset }
  }
  if (scopeParams.filters) {
    const parts = Object.entries(scopeParams.filters)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}: ${v.join(', ')}`)
    return { label: 'Custom', details: parts.join(' • ') || undefined }
  }
  return { label: 'All Active' }
}
