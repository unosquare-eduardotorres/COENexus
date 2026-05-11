import { ReactNode, useEffect } from 'react'
import { MatchToPositionsStepKey } from '../types'
import StepperBar from '../../../shared/components/StepperBar'
import PersonSelector from '../components/match/PersonSelector'
import PositionRankingStep from '../components/match/PositionRankingStep'
import MatchToPositionsSummary from '../components/match/MatchToPositionsSummary'
import SearchProgressComponent from '../components/match/SearchProgress'
import DeliveryToOpResults from '../components/match/DeliveryToOpResults'
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel'
import { useMatchToPositions } from '../hooks/useMatchToPositions'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('MatchToPositionsPage')

const STEP_LABELS: { key: MatchToPositionsStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'select-person',
    title: 'Person',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'position-ranking',
    title: 'Positions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: 'summary',
    title: 'Summary',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: 'analyzing',
    title: 'Analyzing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: 'results',
    title: 'Results',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

function PersonSourceBadge({ sourceType }: { sourceType: string }) {
  const config = {
    candidate: { label: 'Candidate', classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    employee: { label: 'Employee', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    external: { label: 'External Upload', classes: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  }[sourceType] ?? { label: sourceType, classes: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}

export default function MatchToPositionsPage({ onReset: parentReset }: { onReset: () => void }) {
  const {
    wizard: { currentStep, completedSteps, stepSummaries },
    person: { selectedPerson, handlePersonNext },
    positions: { selectedPositionIds, customPositions, handlePositionsConfirm },
    summary: { handleSummaryNext, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeAnalysis },
    results: { results, handleRetryFallbacks },
    detail: { detailMatch, detailEmployee, detailPosition, handleSelectMatch, handleBackFromDetail },
    actions: { handleReset: handleFullReset, handleStepClick, handleBackToIntents },
    adaptedEmployee,
  } = useMatchToPositions(parentReset)

  useEffect(() => {
    log.info('Match-to-positions page viewed')
  }, [])

  if (detailMatch && detailEmployee && detailPosition) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBackFromDetail}
          className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Results
        </button>
        <StepperBar
          stepLabels={STEP_LABELS}
          currentStepKey={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          stepSummaries={stepSummaries}
        />
        <BenchBurnDetailPanel
          match={detailMatch}
          employee={detailEmployee}
          position={detailPosition}
          onBack={handleBackFromDetail}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          log.info('Match-to-positions flow exited to match engine')
          handleBackToIntents()
        }}
        className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Match Engine
      </button>
      <StepperBar
        stepLabels={STEP_LABELS}
        currentStepKey={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        stepSummaries={stepSummaries}
      />

      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {currentStep === 'select-person' && (
        <PersonSelector onNext={handlePersonNext} />
      )}

      {currentStep === 'position-ranking' && selectedPerson && (
        <PositionRankingStep person={selectedPerson} onConfirm={handlePositionsConfirm} />
      )}

      {currentStep === 'summary' && selectedPerson && (
        <MatchToPositionsSummary
          person={selectedPerson}
          positionCount={selectedPositionIds.length}
          customPositionCount={customPositions.length}
          onNext={handleSummaryNext}
        />
      )}

      {currentStep === 'analyzing' && (
        <SearchProgressComponent progress={progress} />
      )}

      {currentStep === 'results' && results && adaptedEmployee && (
        <DeliveryToOpResults
          results={results}
          employee={adaptedEmployee}
          positions={[]}
          onReset={handleFullReset}
          onSelectMatch={handleSelectMatch}
          onRetryFallbacks={handleRetryFallbacks}
          avatarGradient="from-indigo-500 to-violet-500"
          personBadge={selectedPerson ? <PersonSourceBadge sourceType={selectedPerson.sourceType} /> : undefined}
          flowLabel="Match to Positions — Results"
        />
      )}

      {showSessionNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionNamePrompt(false)} />
          <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-primary mb-1">Name This Search</h3>
            <p className="text-sm text-secondary mb-4">Give this match-to-positions session a name so you can find it later.</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeAnalysis()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="e.g., Match to Positions — Jane Smith"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  log.info('Match-to-positions run prompt canceled')
                  setShowSessionNamePrompt(false)
                }}
                className="px-4 py-2 text-sm text-muted hover:text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  log.info('Match-to-positions run confirmed', { sessionName })
                  executeAnalysis()
                }}
                className="px-5 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Start Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
