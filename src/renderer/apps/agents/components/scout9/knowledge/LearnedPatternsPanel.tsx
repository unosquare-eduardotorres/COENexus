import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight } from 'lucide-react'

interface Pattern {
  id: string
  pattern_name: string
  pattern_text: string
  confidence_score: number
  usage_count: number
  is_active: number
  created_at: string
}

export default function LearnedPatternsPanel() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => { loadPatterns() }, [])

  async function loadPatterns() {
    try {
      const result = await window.api?.scout9?.listPatterns?.()
      if (result?.success && result.data) setPatterns(result.data as Pattern[])
    } catch {}
  }

  async function handleToggle(pattern: Pattern) {
    try {
      await window.api?.scout9?.togglePattern?.({ id: pattern.id, is_active: pattern.is_active === 1 ? 0 : 1 })
      loadPatterns()
    } catch {}
  }

  const filtered = patterns.filter(p => {
    if (filter === 'active') return p.is_active === 1
    if (filter === 'inactive') return p.is_active === 0
    return true
  })

  function effectivenessColor(score: number): string {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-primary">Learned Patterns</h4>
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                filter === f ? 'bg-violet-500/15 text-violet-400' : 'text-muted hover:text-secondary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-muted text-center py-6">No patterns found. Patterns are created from skip feedback during report review.</p>
      )}

      {filtered.map(pattern => (
        <div key={pattern.id} className={`glass-panel-subtle p-3 rounded-xl ${pattern.is_active === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-semibold text-primary">{pattern.pattern_name}</h5>
                {pattern.confidence_score < 40 && pattern.is_active === 1 && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-500/15 text-red-400">LOW EFFECTIVENESS</span>
                )}
              </div>
              <p className="text-[11px] text-secondary mt-1">{pattern.pattern_text}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-dark-surface">
                    <div
                      className={`h-full rounded-full ${effectivenessColor(pattern.confidence_score)}`}
                      style={{ width: `${Math.min(100, pattern.confidence_score)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted">{pattern.confidence_score}%</span>
                </div>
                <span className="text-[9px] text-muted">Used {pattern.usage_count}x</span>
              </div>
            </div>
            <button onClick={() => handleToggle(pattern)} className="text-muted hover:text-primary p-1 flex-shrink-0">
              {pattern.is_active === 1 ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
