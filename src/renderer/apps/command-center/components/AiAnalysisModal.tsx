/**
 * AiAnalysisModal — centered progress modal shown during AI analysis.
 * Supports multi-phase progress (loading → analyzing → classifying → done).
 */

import type { PositionAttentionProgress } from '../../../../shared/ipc-types'
import { BrainCircuit } from 'lucide-react'

export interface AiAnalysisProgress {
  completed: number
  total: number
}

interface Props {
  open: boolean
  progress: AiAnalysisProgress | PositionAttentionProgress
}

function isAttentionProgress(p: AiAnalysisProgress | PositionAttentionProgress): p is PositionAttentionProgress {
  return 'phase' in p
}

export default function AiAnalysisModal({ open, progress }: Props) {
  if (!open) return null

  const isMultiPhase = isAttentionProgress(progress)
  const completed = progress.completed
  const total = progress.total
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  // Build descriptive text based on phase
  let statusText = 'Starting analysis…'
  let subtitle = 'Evaluating discussion threads for each position…'

  if (isMultiPhase) {
    switch (progress.phase) {
      case 'loading':
        statusText = 'Loading active positions…'
        subtitle = 'Fetching positions and discussions from database…'
        break
      case 'analyzing':
        if (completed === 0) {
          statusText = 'Starting AI classification…'
        } else if (progress.currentPosition) {
          statusText = `Analyzing ${progress.currentPosition}… (${completed} of ${total})`
        } else {
          statusText = `Analyzing position ${completed} of ${total}…`
        }
        subtitle = 'AI is classifying each position\'s attention state…'
        break
      case 'classifying':
        statusText = 'Grouping by COE ownership…'
        subtitle = 'Organizing results and applying auto-escalation rules…'
        break
      case 'done':
        statusText = 'Analysis complete!'
        subtitle = 'Report is ready.'
        break
    }
  } else {
    if (completed === 0) statusText = 'Starting analysis…'
    else if (completed >= total) statusText = 'Finalizing results…'
    else statusText = `Analyzing position ${completed} of ${total}…`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-[400px] flex flex-col items-center gap-5 shadow-2xl border border-white/10">
        {/* Animated sparkle icon */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#304FF3]/20 animate-ping" style={{ animationDuration: '2s' }} />
          {/* Inner icon container */}
          <div className="relative w-14 h-14 rounded-full bg-[#304FF3]/15 flex items-center justify-center animate-pulse">
            <BrainCircuit className="w-7 h-7 text-[#304FF3] animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-primary">Analyzing with AI</h3>
          <p className="text-sm text-muted mt-1">{subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#304FF3] to-blue-400 transition-all duration-500 ease-out"
              style={{ width: `${isMultiPhase && progress.phase === 'loading' ? 5 : pct}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted">{statusText}</p>
        </div>

        {/* Phase indicators (multi-phase only) */}
        {isMultiPhase && (
          <div className="flex gap-3 text-xs text-muted">
            {(['loading', 'analyzing', 'classifying', 'done'] as const).map((phase, i) => {
              const isActive = progress.phase === phase
              const isPast = ['loading', 'analyzing', 'classifying', 'done'].indexOf(progress.phase) > i
              return (
                <span
                  key={phase}
                  className={`px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-[#304FF3]/20 text-blue-300 font-medium' :
                    isPast ? 'text-green-400' : 'text-gray-500'
                  }`}
                >
                  {isPast ? '✓' : ''} {phase === 'loading' ? 'Load' : phase === 'analyzing' ? 'Analyze' : phase === 'classifying' ? 'Group' : 'Done'}
                </span>
              )
            })}
          </div>
        )}

        {/* Shimmer dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#304FF3]/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
