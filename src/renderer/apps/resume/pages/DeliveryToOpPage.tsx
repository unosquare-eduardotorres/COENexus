import { ReactNode } from 'react';
import { DeliveryToOpStepKey } from '../types';
import StepperBar from '../../../shared/components/StepperBar';
import DeliveryEmployeeSelector from '../components/match/DeliveryEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import DeliveryToOpSummary from '../components/match/DeliveryToOpSummary';
import SearchProgressComponent from '../components/match/SearchProgress';
import DeliveryToOpResults from '../components/match/DeliveryToOpResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { useDeliveryToOp } from '../hooks/useDeliveryToOp';
interface DeliveryToOpPageProps {
  onReset: () => void;
  initialSessionId?: number | null;
}

const STEP_LABELS: { key: DeliveryToOpStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'employee',
    title: 'Employee',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'positions',
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
];

export default function DeliveryToOpPage({ onReset: parentReset }: { onReset: () => void }) {
  const {
    wizard: { currentStep, completedSteps, stepSummaries },
    employee: { selectedEmployee, handleEmployeeNext },
    positions: { selectedPositions, handlePositionsNext },
    summary: { customPositions, setCustomPositions, handleStartAnalysis, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeDeliveryToOp },
    results: { results, handleRetryFallbacks, handleExportToExcel },
    detail: { detailMatch, setDetailMatch, detailEmployee, detailPosition, handleShowDetail },
    actions: { handleReset, handleStepClick },
  } = useDeliveryToOp(parentReset);

  return (
    <div className="space-y-4">
      <button
        onClick={handleBackToIntents}
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

      {currentStep === 'employee' && (
        <DeliveryEmployeeSelector
          onNext={handleEmployeeNext}
          initialSelected={selectedEmployee}
        />
      )}

      {currentStep === 'positions' && (
        <BenchPositionSelector
          onNext={handlePositionsNext}
          initialSelected={selectedPositions}
          initialCustom={customPositions}
        />
      )}

      {currentStep === 'summary' && selectedEmployee && (
        <DeliveryToOpSummary
          employee={selectedEmployee}
          positionCount={selectedPositions.length + customPositions.length}
          onNext={handleSummaryNext}
        />
      )}

      {currentStep === 'analyzing' && (
        <SearchProgressComponent progress={progress} />
      )}

      {currentStep === 'results' && results && selectedEmployee && (
        <DeliveryToOpResults
          results={results}
          employee={selectedEmployee}
          positions={selectedPositions}
          onReset={handleFullReset}
          onSelectMatch={handleSelectMatch}
          onRetryFallbacks={handleRetryFallbacks}
        />
      )}
      {showSessionNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionNamePrompt(false)} />
          <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-primary mb-1">Name This Search</h3>
            <p className="text-sm text-secondary mb-4">Give this delivery-to-OP session a name so you can find it later.</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeDeliveryToOp()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="e.g., Delivery Professional to OP — March 2026"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowSessionNamePrompt(false)}
                className="px-4 py-2 text-sm text-muted hover:text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeliveryToOp}
                className="px-5 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                Start Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
