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
  manualJobDescription: string
  onManualJobDescriptionChange: (value: string) => void
}

export default function PositionPicker({
  selectedPositionId, onPositionChange, manualTitle, manualAccount,
  onManualChange, skipPosition, onSkipChange, manualJobDescription, onManualJobDescriptionChange,
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
      p.mainSkill.toLowerCase().includes(q) ||
      String(p.upstreamId).includes(q) ||
      (p.verticalIndustry ?? '').toLowerCase().includes(q) ||
      (p.coe ?? '').toLowerCase().includes(q) ||
      (p.practice ?? '').toLowerCase().includes(q)
    )
  }, [positions, searchQuery])

  const selectedPosition = useMemo(() => {
    return positions.find(p => p.upstreamId === selectedPositionId) ?? null
  }, [positions, selectedPositionId])

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-r border-gray-200 dark:border-dark-border
            ${!skipPosition
              ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
              : 'text-muted hover:text-primary hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
          onClick={() => onSkipChange(false)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          From Synced Positions
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2
            ${skipPosition
              ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
              : 'text-muted hover:text-primary hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
          onClick={() => onSkipChange(true)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Manual Entry
        </button>
      </div>

      {skipPosition ? (
        <div className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Job Description</label>
            <textarea
              className="glass-input w-full min-h-[120px]"
              placeholder="Paste or type the job description for this prospect…"
              value={manualJobDescription}
              onChange={e => onManualJobDescriptionChange(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search positions by account, title, skill, or ID..."
            className="glass-input w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                {searchQuery
                  ? `${filtered.length} of ${positions.length} positions`
                  : `${positions.length} Active / Draft positions`}
              </p>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-dark-surface text-left text-muted">
                    <tr>
                      <th className="p-2">ID</th>
                      <th className="p-2">Account</th>
                      <th className="p-2">Vertical</th>
                      <th className="p-2">COE</th>
                      <th className="p-2">Practice</th>
                      <th className="p-2">Main Skill</th>
                      <th className="p-2">Seniorities</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Aging</th>
                      <th className="p-2">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(pos => (
                      <tr
                        key={pos.upstreamId}
                        className={`border-t border-gray-100 dark:border-dark-border cursor-pointer transition-colors
                          ${selectedPositionId === pos.upstreamId
                            ? 'bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-500'
                            : 'hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
                        onClick={() => onPositionChange(selectedPositionId === pos.upstreamId ? null : pos)}
                      >
                        <td className="p-2 text-muted font-mono text-xs">{pos.upstreamId}</td>
                        <td className="p-2 font-medium text-primary">{pos.account}</td>
                        <td className="p-2 text-muted">{pos.verticalIndustry || '—'}</td>
                        <td className="p-2 text-muted">{pos.coe || '—'}</td>
                        <td className="p-2 text-muted">{pos.practice || '—'}</td>
                        <td className="p-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400">
                            {pos.mainSkill}
                          </span>
                        </td>
                        <td className="p-2 text-muted text-xs">{pos.seniorities || '—'}</td>
                        <td className="p-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                            ${pos.positionStatus === 'Active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {pos.positionStatus}
                          </span>
                        </td>
                        <td className="p-2 text-muted text-xs">{pos.aging ?? '—'}d</td>
                        <td className="p-2 text-muted text-xs">{pos.availableRange || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center text-muted py-6 text-sm">No positions found</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {selectedPosition && !skipPosition && (
        <div className="glass-panel-subtle p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-primary">{selectedPosition.account} — {selectedPosition.jobTitle}</span>
              <div className="text-xs text-muted mt-0.5">
                ID: {selectedPosition.upstreamId} · {selectedPosition.mainSkill} · {selectedPosition.positionStatus}
                {selectedPosition.aging != null && ` · ${selectedPosition.aging}d aging`}
              </div>
            </div>
            <button
              onClick={() => onPositionChange(null)}
              className="text-xs text-red-400 hover:text-red-500 transition-colors"
            >
              Deselect
            </button>
          </div>
          {selectedPosition.jobDescription ? (
            <div>
              <span className="text-xs font-medium text-secondary">Job Description</span>
              <p className="text-xs text-muted mt-1 line-clamp-4 whitespace-pre-wrap">{selectedPosition.jobDescription}</p>
            </div>
          ) : (
            <div className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              This position has no job description. AI features will work without it but results improve with a JD.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
