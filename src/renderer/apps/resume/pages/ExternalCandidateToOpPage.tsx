import { ReactNode } from 'react';
import { ExternalCandidateToOpStepKey } from '../types';
import StepperBar from '../../../shared/components/StepperBar';
import ExternalResumeUploader from '../components/match/ExternalResumeUploader';
import ExternalPositionStep from '../components/match/ExternalPositionStep';
import ExternalCandidateToOpSummary from '../components/match/ExternalCandidateToOpSummary';
import SearchProgressComponent from '../components/match/SearchProgress';
import ExternalCandidateToOpResults from '../components/match/ExternalCandidateToOpResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { useExternalCandidateToOp } from '../hooks/useExternalCandidateToOp';
interface ExternalCandidateToOpPageProps {
  onReset: () => void;
  initialSessionId?: number | null;
}

const STEP_LABELS: { key: ExternalCandidateToOpStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'upload',
    title: 'Upload',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242M12 12v9m0-9l-4 4m4-4l4 4" />
      </svg>
    ),
  },
  {
    key: 'position',
    title: 'Position',
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

export default function ExternalCandidateToOpPage({ onReset: parentReset }: ExternalCandidateToOpPageProps) {
  const {
    wizard: { currentStep, completedSteps, stepSummaries },
    upload: { uploadedResumes, handleUploadNext },
    positions: { selectedPosition, customPosition, handlePositionNext, effectivePosition },
    summary: { handleSummaryNext, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeExternalCandidateMatch },
    results: { results },
    detail: { detailMatch, setDetailMatch, detailEmployee, detailPosition, handleSelectMatch },
    actions: { handleReset: handleFullReset, handleStepClick, handleBackToIntents },
  } = useExternalCandidateToOp(parentReset);

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

      {currentStep === 'upload' && (
        <ExternalResumeUploader
          onNext={handleUploadNext}
          initialResumes={uploadedResumes.length > 0 ? uploadedResumes : undefined}
        />
      )}

      {currentStep === 'position' && (
        <ExternalPositionStep
          onNext={handlePositionNext}
          initialPosition={selectedPosition}
          initialCustomPosition={customPosition}
        />
      )}

      {currentStep === 'summary' && effectivePosition && (
        <ExternalCandidateToOpSummary
          resumes={uploadedResumes.filter(r => r.status === 'parsed')}
          position={effectivePosition}
          onNext={handleSummaryNext}
        />
      )}

      {currentStep === 'analyzing' && (
        <SearchProgressComponent progress={progress} />
      )}

      {currentStep === 'results' && results && effectivePosition && (
        <ExternalCandidateToOpResults
          results={results}
          resumes={uploadedResumes}
          position={effectivePosition}
          onReset={handleFullReset}
          onSelectMatch={handleSelectMatch}
        />
      )}
      {showSessionNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionNamePrompt(false)} />
          <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-primary mb-1">Name This Search</h3>
            <p className="text-sm text-secondary mb-4">Give this external candidate analysis a name so you can find it later.</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeExternalCandidateMatch()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="e.g., External Candidate to OP — March 2026"
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
                onClick={executeExternalCandidateMatch}
                className="px-5 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
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
