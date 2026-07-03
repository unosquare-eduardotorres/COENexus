// Reusable lock button component with drift detection for locking a measure
// achievement value to the Overview calculator.

import { useBonusConfig } from '../../contexts/BonusConfigContext'
import type { MeasureKey, MeasureLock } from '../../types/bonusConfig'

interface LockToOverviewButtonProps {
  measureKey: MeasureKey
  currentAchievement: number
  periodLabel: string
  filters: Record<string, unknown>
  exclusions?: string[]
}

function LockIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UnlockIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

export default function LockToOverviewButton({
  measureKey,
  currentAchievement,
  periodLabel,
  filters,
  exclusions,
}: LockToOverviewButtonProps) {
  const { config, lockMeasure, unlockMeasure } = useBonusConfig()
  const lock = config.locks[measureKey]

  const handleLock = () => {
    const newLock: MeasureLock = {
      achievement: currentAchievement,
      periodLabel,
      lockedAt: new Date().toISOString(),
      filters,
      exclusions,
    }
    lockMeasure(measureKey, newLock)
  }

  const handleUnlock = () => {
    unlockMeasure(measureKey)
  }

  // Not locked → show "Lock to Overview" button
  if (!lock) {
    return (
      <button
        type="button"
        onClick={handleLock}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
      >
        <LockIcon className="w-3.5 h-3.5" />
        Lock to Overview
      </button>
    )
  }

  // Locked — check for drift
  const hasDrift = Math.abs(currentAchievement - lock.achievement) >= 0.05

  if (hasDrift) {
    // Drift detected → show "Update Lock" amber button
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleLock}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-100 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          Update Lock · {lock.achievement.toFixed(1)}% → {currentAchievement.toFixed(1)}%
        </button>
        <button
          type="button"
          onClick={handleUnlock}
          title="Remove lock"
          className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
        >
          <UnlockIcon className="w-3 h-3" />
        </button>
      </div>
    )
  }

  // Locked, no drift → show subtle "Locked" badge
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 glass-panel-subtle rounded-lg border border-emerald-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        Locked · {lock.achievement.toFixed(1)}% · {lock.periodLabel}
      </span>
      <button
        type="button"
        onClick={handleUnlock}
        title="Remove lock"
        className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
      >
        <UnlockIcon className="w-3 h-3" />
      </button>
    </div>
  )
}
