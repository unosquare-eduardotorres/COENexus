import { useState, useEffect, useMemo } from 'react'
import type { BenchOpenPosition } from '../../types'
import { benchBurnService } from '../../services/benchBurnService'

interface PositionPickerProps {
  selectedPositionId: number | null
  onPositionChange: (position: BenchOpenPosition | null) => void
  manualTitle: string
  manualAccount: string
  onManualChange: (field: 'title' | 'account', value: string) => void
  skipPosition: boolean
  onSkipChange: (skip: boolean) => void
}

export default function PositionPicker({
  selectedPositionId, onPositionChange, manualTitle, manualAccount,
  onManualChange, skipPosition, onSkipChange,
}: PositionPickerProps) {
  const [positions, setPositions] = useState<BenchOpenPosition[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    benchBurnService.getOpenPositions()
      .then(setPositions)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!searchQuery) return positions
    const q = searchQuery.toLowerCase()
    return positions.filter(p =>
      p.account.toLowerCase().includes(q) ||
      p.jobTitle.toLowerCase().includes(q) ||
      p.mainSkill.toLowerCase().includes(q)
    )
  }, [positions, searchQuery])

  const selectedPosition = useMemo(() => {
    return positions.find(p => p.upstreamId === selectedPositionId) ?? null
  }, [positions, selectedPositionId])

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={skipPosition}
          onChange={e => onSkipChange(e.target.checked)}
          className="rounded border-gray-300 dark:border-dark-border"
        />
        <span className="text-sm text-primary">Skip position selection (manual entry)</span>
      </label>

      {skipPosition ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Position Title</label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="e.g., Python Engineer"
              value={manualTitle}
              onChange={e => onManualChange('title', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Account Name</label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="e.g., Acme Corp"
              value={manualAccount}
              onChange={e => onManualChange('account', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search positions by account, title, or skill..."
            className="glass-input w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filtered.map(pos => (
                <div
                  key={pos.upstreamId}
                  className={`glass-card-hover p-3 cursor-pointer transition-all ${selectedPositionId === pos.upstreamId ? 'ring-2 ring-accent-500' : ''}`}
                  onClick={() => onPositionChange(selectedPositionId === pos.upstreamId ? null : pos)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-primary">{pos.account}</span>
                      <span className="text-muted mx-2">·</span>
                      <span className="text-secondary">{pos.jobTitle}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400">
                      {pos.mainSkill}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-1">ID: {pos.upstreamId}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-muted py-6 text-sm">No positions found</div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedPosition && !skipPosition && (
        <div className="glass-panel-subtle p-3">
          <div className="text-sm font-medium text-primary">Selected: {selectedPosition.account} - {selectedPosition.jobTitle}</div>
          <div className="text-xs text-muted mt-1">ID: {selectedPosition.upstreamId} · Main Skill: {selectedPosition.mainSkill}</div>
        </div>
      )}
    </div>
  )
}
