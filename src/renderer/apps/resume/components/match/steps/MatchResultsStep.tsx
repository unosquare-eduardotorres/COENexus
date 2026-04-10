import { ReactNode } from 'react'
import {
  DataSource,
  MatchCandidate,
  PipelineStats as PipelineStatsType,
  PipelineStages,
  PipelineStageKey,
  SearchMode,
  TopN,
  MatchFlowType,
  MatchSessionSummary,
} from '../../../types'
import PipelineStatsDisplay from '../PipelineStats'
import CandidateCard from '../CandidateCard'
import SessionHistory from '../SessionHistory'

interface MatchResultsStepProps {
  candidates: MatchCandidate[]
  stats: PipelineStatsType | null
  pipelineStages: PipelineStages | null
  animateIn: boolean
  sessionId: number | null
  dataSource: DataSource
  searchMode: SearchMode
  activeConstraintCount: number
  compareList: MatchCandidate[]
  sessions: MatchSessionSummary[]
  showSessionHistory: boolean
  deeperTopN: TopN
  matchFlow: MatchFlowType | null
  onReset: () => void
  onExportToExcel: () => void
  onSelectCandidate: (candidate: MatchCandidate) => void
  onToggleCompare: (candidate: MatchCandidate) => void
  onStartCompare: () => void
  onStageClick: (stage: PipelineStageKey) => void
  onToggleSessionHistory: () => void
  onLoadSession: (id: number) => void
  onAnalyzeDeeper: () => void
}

const SOURCE_LABELS: Record<DataSource, string> = {
  bench: 'Bench',
  'all-employees': 'Employees',
  candidates: 'Candidates',
  'all-sources': 'All Sources',
}

export default function MatchResultsStep({
  candidates,
  stats,
  pipelineStages,
  animateIn,
  sessionId,
  dataSource,
  searchMode,
  activeConstraintCount,
  compareList,
  sessions,
  showSessionHistory,
  onReset,
  onExportToExcel,
  onSelectCandidate,
  onToggleCompare,
  onStartCompare,
  onStageClick,
  onToggleSessionHistory,
  onLoadSession,
  onAnalyzeDeeper,
}: MatchResultsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Search
            </button>
            {sessions.length > 0 && (
              <button
                onClick={onToggleSessionHistory}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  showSessionHistory ? 'text-accent-500' : 'text-muted hover:text-secondary'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            )}
          </div>
          <h2 className="text-2xl font-bold text-primary">Match Results</h2>
          <p className="text-sm text-secondary mt-1">
            <span className="font-mono font-semibold text-primary">{candidates.length}</span> candidates matched
            <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {SOURCE_LABELS[dataSource]}
            </span>
            {activeConstraintCount > 0 && (
              <span className="ml-1 text-xs font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {activeConstraintCount} constraint{activeConstraintCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-8">
          {searchMode !== 'opus' && (
            <button
              onClick={onAnalyzeDeeper}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              🔬 Analyze Deeper
            </button>
          )}
          <button
            onClick={onStartCompare}
            disabled={compareList.length < 2}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-500 disabled:hover:to-accent-600"
          >
            Compare Selected ({compareList.length})
          </button>
          <button
            onClick={onExportToExcel}
            disabled={candidates.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>
      </div>

      {showSessionHistory && (
        <SessionHistory
          sessions={sessions}
          onLoadSession={onLoadSession}
          currentSessionId={sessionId}
          onClose={onToggleSessionHistory}
        />
      )}

      {stats && (
        <PipelineStatsDisplay
          stats={stats}
          pipelineStages={pipelineStages}
          onStageClick={onStageClick}
        />
      )}

      <div className={`space-y-2 transition-opacity duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            rank={index + 1}
            isCompareSelected={compareList.some((c) => c.id === candidate.id)}
            onSelect={() => onSelectCandidate(candidate)}
            onToggleCompare={() => onToggleCompare(candidate)}
          />
        ))}
      </div>
    </div>
  )
}
