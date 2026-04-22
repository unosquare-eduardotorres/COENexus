import { useState, useMemo } from 'react'
import type { BraniacPattern, BraniacApprovalStatus } from '../../../../../shared/ipc-types'
import BraniacPatternReviewCard from './BraniacPatternReviewCard'

type FilterTab = 'all' | 'pending_review' | 'approved' | 'auto_applied' | 'rejected'

interface BraniacPatternListProps {
  patterns: BraniacPattern[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason?: string) => Promise<void>
  onUpdate: (id: string, updates: { pattern_text?: string; confidence_score?: number }) => Promise<void>
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'auto_applied', label: 'Auto-applied' },
  { key: 'rejected', label: 'Rejected' },
]

export default function BraniacPatternList({ patterns, onApprove, onReject, onUpdate }: BraniacPatternListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const pendingCount = useMemo(
    () => patterns.filter(p => p.approval_status === 'pending_review').length,
    [patterns]
  )

  const filteredPatterns = useMemo(() => {
    if (activeTab === 'all') return patterns
    return patterns.filter(p => p.approval_status === (activeTab as BraniacApprovalStatus))
  }, [patterns, activeTab])

  if (patterns.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-base font-semibold text-primary mb-3">Learned Patterns</h2>
        <p className="text-sm text-muted">No patterns inferred yet. Run a Braniac job to discover patterns.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Learned Patterns</h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </div>
        <span className="text-xs text-muted">{patterns.length} patterns</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const tabCount = tab.key === 'all'
            ? patterns.length
            : patterns.filter(p => p.approval_status === tab.key).length

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-500/30'
                  : 'text-muted hover:bg-gray-100 dark:hover:bg-dark-hover/50'
              }`}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className={`ml-1 ${isActive ? 'text-violet-500 dark:text-violet-400' : 'text-muted'}`}>
                  ({tabCount})
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {filteredPatterns.length === 0 ? (
          <p className="text-sm text-muted py-3 text-center">No patterns in this category.</p>
        ) : (
          filteredPatterns.map(pattern => (
            <BraniacPatternReviewCard
              key={pattern.id}
              pattern={pattern}
              onApprove={onApprove}
              onReject={onReject}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
