import { useState, useEffect, useCallback, useMemo } from 'react'
import { MatchToPositionsPerson, RankedPositionDto } from '../../types'
import { benchBurnService } from '../../services/benchBurnService'
import SortableHeader, { useSort, sortData } from './SortableHeader'

type PosSortKey = 'rank' | 'account' | 'jobTitle' | 'mainSkill' | 'seniorities' | 'aging' | 'countries' | 'cosineSimilarity'

function posAccessor(pos: RankedPositionDto & { rank: number }, key: string): string | number | null {
  switch (key) {
    case 'rank': return pos.rank
    case 'account': return pos.account
    case 'jobTitle': return pos.jobTitle
    case 'mainSkill': return pos.mainSkill
    case 'seniorities': return pos.seniorities
    case 'aging': return pos.aging
    case 'countries': return pos.countries
    case 'cosineSimilarity': return pos.cosineSimilarity
    default: return null
  }
}

const TOP_N_OPTIONS = [5, 10, 15, 20] as const

interface PositionRankingStepProps {
  person: MatchToPositionsPerson
  onConfirm: (positionUpstreamIds: number[], customPositions: { name: string; jd: string }[]) => void
}

export default function PositionRankingStep({ person, onConfirm }: PositionRankingStepProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rankedPositions, setRankedPositions] = useState<(RankedPositionDto & { rank: number })[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [topN, setTopN] = useState<number>(10)
  const [customPositions, setCustomPositions] = useState<{ name: string; jd: string }[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customJd, setCustomJd] = useState('')

  const { sortKey, sortDir, handleSort } = useSort<PosSortKey>('rank')

  useEffect(() => {
    setLoading(true)
    setError(null)

    const fetchPositions = async () => {
      try {
        let result: { positions: RankedPositionDto[] }
        if (person.sourceType === 'external') {
          result = await benchBurnService.rankPositionsForText(person.resumeText!, 30)
        } else {
          result = await benchBurnService.rankPositionsForPerson(
            person.sourceType as 'candidate' | 'employee',
            person.upstreamId,
            30
          )
        }
        const ranked = result.positions.map((p, i) => ({ ...p, rank: i + 1 }))
        setRankedPositions(ranked)
        setSelectedIds(new Set(ranked.slice(0, topN).map(p => p.upstreamId)))
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rank positions')
        setLoading(false)
      }
    }

    fetchPositions()
  }, [person])

  const handleTopNChange = useCallback((n: number) => {
    setTopN(n)
    setSelectedIds(new Set(rankedPositions.slice(0, n).map(p => p.upstreamId)))
  }, [rankedPositions])

  const togglePosition = useCallback((upstreamId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(upstreamId)) next.delete(upstreamId)
      else next.add(upstreamId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === rankedPositions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rankedPositions.map(p => p.upstreamId)))
    }
  }, [selectedIds.size, rankedPositions])

  const addCustomPosition = useCallback(() => {
    if (!customName.trim() || !customJd.trim()) return
    setCustomPositions(prev => [...prev, { name: customName.trim(), jd: customJd.trim() }])
    setCustomName('')
    setCustomJd('')
    setShowCustomForm(false)
  }, [customName, customJd])

  const removeCustom = useCallback((idx: number) => {
    setCustomPositions(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const sortedPositions = useMemo(
    () => sortData(rankedPositions, sortKey, sortDir, posAccessor),
    [rankedPositions, sortKey, sortDir]
  )

  const totalSelected = selectedIds.size + customPositions.length

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">
          {person.sourceType === 'external' ? 'Generating embedding and ranking positions...' : 'Ranking positions by similarity...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-red-500">Failed to rank positions: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">
          Matching Positions for {person.name}
        </h2>
        <p className="text-sm text-muted mt-1">
          {person.seniority && `${person.seniority} · `}{person.mainSkill && `${person.mainSkill} · `}{person.country}
        </p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary">Pre-select top:</span>
            {TOP_N_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => handleTopNChange(n)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  topN === n
                    ? 'bg-indigo-500 text-white'
                    : 'glass-panel-subtle text-muted hover:text-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === rankedPositions.length}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500/30"
              />
              Select All
            </label>
            <span className="text-xs text-muted">
              {selectedIds.size} of {rankedPositions.length} selected
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm z-10">
              <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8" />
                <SortableHeader<PosSortKey> label="#" sortKey="rank" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Account" sortKey="account" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Job Title" sortKey="jobTitle" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Main Skill" sortKey="mainSkill" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Seniorities" sortKey="seniorities" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Aging" sortKey="aging" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} align="right" />
                <SortableHeader<PosSortKey> label="Countries" sortKey="countries" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<PosSortKey> label="Similarity" sortKey="cosineSimilarity" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {sortedPositions.map(pos => {
                const isChecked = selectedIds.has(pos.upstreamId)
                return (
                  <tr
                    key={pos.upstreamId}
                    onClick={() => togglePosition(pos.upstreamId)}
                    className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors cursor-pointer ${
                      isChecked ? 'bg-indigo-500/5' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePosition(pos.upstreamId)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-muted">#{pos.rank}</td>
                    <td className="py-2 px-2 font-medium text-primary">{pos.account}</td>
                    <td className="py-2 px-2 text-secondary">{pos.jobTitle}</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{pos.mainSkill}</span>
                    </td>
                    <td className="py-2 px-2 text-muted text-xs">{pos.seniorities}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-secondary">{pos.aging}d</td>
                    <td className="py-2 px-2 text-muted text-xs">{pos.countries}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-mono text-xs font-medium ${
                        pos.cosineSimilarity >= 0.8 ? 'text-emerald-600 dark:text-emerald-400'
                          : pos.cosineSimilarity >= 0.6 ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-muted'
                      }`}>
                        {pos.cosineSimilarity.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rankedPositions.length === 0 && (
            <p className="text-center text-sm text-muted py-6">No vectorized positions found. Ensure positions are synced and vectorized.</p>
          )}
        </div>
      </div>

      {customPositions.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Custom Positions</h3>
          <div className="space-y-2">
            {customPositions.map((cp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl glass-panel-subtle">
                <div>
                  <div className="text-sm font-medium text-primary">{cp.name}</div>
                  <div className="text-xs text-muted truncate max-w-md">{cp.jd.slice(0, 100)}...</div>
                </div>
                <button
                  onClick={() => removeCustom(idx)}
                  className="text-red-500 hover:text-red-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCustomForm ? (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-primary">Add Custom Position</h3>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="Position name (e.g., Senior React Developer)"
            className="w-full px-4 py-2 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <textarea
            value={customJd}
            onChange={e => setCustomJd(e.target.value)}
            placeholder="Paste or type the job description..."
            rows={4}
            className="w-full px-4 py-2 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30 resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addCustomPosition}
              disabled={!customName.trim() || !customJd.trim()}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Position
            </button>
            <button
              onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomJd('') }}
              className="px-4 py-2 text-sm text-muted hover:text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCustomForm(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Position
        </button>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => onConfirm(Array.from(selectedIds), customPositions)}
          disabled={totalSelected === 0}
          className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Confirm &amp; Analyze ({totalSelected} position{totalSelected !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  )
}
