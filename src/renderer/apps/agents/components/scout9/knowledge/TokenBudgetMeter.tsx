import { useState, useEffect } from 'react'

interface TokenBudgetMeterProps {
  className?: string
}

interface BudgetData {
  rules: number
  glossary: number
  patterns: number
  notes: number
  total: number
  ceiling: number
}

export default function TokenBudgetMeter({ className }: TokenBudgetMeterProps) {
  const [budget, setBudget] = useState<BudgetData>({ rules: 0, glossary: 0, patterns: 0, notes: 0, total: 0, ceiling: 6000 })

  useEffect(() => {
    window.api?.scout9?.getTokenBudget?.().then((result: { success: boolean; data?: unknown }) => {
      if (result?.success && result.data) {
        const d = result.data as { token_budget: number; estimated_tokens: number; remaining_tokens: number }
        setBudget({
          rules: Math.round(d.estimated_tokens * 0.3),
          glossary: Math.round(d.estimated_tokens * 0.2),
          patterns: Math.round(d.estimated_tokens * 0.25),
          notes: Math.round(d.estimated_tokens * 0.25),
          total: d.estimated_tokens,
          ceiling: d.token_budget,
        })
      }
    }).catch(() => {})
  }, [])

  const pct = budget.ceiling > 0 ? (budget.total / budget.ceiling) * 100 : 0
  const isWarning = pct > 90

  const segments = [
    { label: 'Rules', value: budget.rules, color: 'bg-blue-500' },
    { label: 'Glossary', value: budget.glossary, color: 'bg-green-500' },
    { label: 'Patterns', value: budget.patterns, color: 'bg-violet-500' },
    { label: 'Notes', value: budget.notes, color: 'bg-orange-500' },
  ]

  return (
    <div className={`glass-panel-subtle p-3 rounded-xl ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Token Budget</span>
        <span className={`text-xs font-mono font-bold ${isWarning ? 'text-red-400' : 'text-primary'}`}>
          {budget.total.toLocaleString()} / {budget.ceiling.toLocaleString()}
        </span>
      </div>

      <div className={`flex h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-surface ${isWarning ? 'ring-1 ring-red-500/50' : ''}`}>
        {segments.map(seg => {
          const segPct = budget.ceiling > 0 ? (seg.value / budget.ceiling) * 100 : 0
          if (segPct <= 0) return null
          return (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-300`}
              style={{ width: `${segPct}%` }}
              title={`${seg.label}: ${seg.value.toLocaleString()} tokens`}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`} />
            <span className="text-[9px] text-muted">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
