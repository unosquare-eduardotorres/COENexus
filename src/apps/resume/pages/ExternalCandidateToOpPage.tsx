import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  ExternalCandidateToOpStepKey,
  ExternalResumeFile,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import StepperBar from '../components/shared/StepperBar';
import ExternalResumeUploader from '../components/match/ExternalResumeUploader';
import ExternalPositionStep from '../components/match/ExternalPositionStep';
import ExternalCandidateToOpSummary from '../components/match/ExternalCandidateToOpSummary';
import SearchProgressComponent from '../components/match/SearchProgress';
import ExternalCandidateToOpResults from '../components/match/ExternalCandidateToOpResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { getMatchPrompts } from '../data/defaultMatchPrompts';

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

export default function ExternalCandidateToOpPage({ onReset: parentReset, initialSessionId }: ExternalCandidateToOpPageProps) {
  const [currentStep, setCurrentStep] = useState<ExternalCandidateToOpStepKey>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<ExternalCandidateToOpStepKey>>(new Set());

  const [uploadedResumes, setUploadedResumes] = useState<ExternalResumeFile[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<BenchOpenPosition | null>(null);
  const [customPosition, setCustomPosition] = useState<{ name: string; jd: string } | null>(null);
  const [progress, setProgress] = useState<SearchProgressType>({ percent: 0, stage: '' });
  const [results, setResults] = useState<BenchBurnSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showSessionNamePrompt, setShowSessionNamePrompt] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const [detailMatch, setDetailMatch] = useState<CrossMatchResult | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<BenchEmployee | null>(null);
  const [detailPosition, setDetailPosition] = useState<BenchOpenPosition | null>(null);

  useEffect(() => {
    if (!initialSessionId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await benchBurnService.getSession(initialSessionId);
        if (cancelled) return;

        setResults(result);

        setCompletedSteps(new Set<ExternalCandidateToOpStepKey>(['upload', 'position', 'summary', 'analyzing']));
        setCurrentStep('results');
      } catch (err) {
        console.error('Failed to load external-candidate-to-op session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    })();

    return () => { cancelled = true; };
  }, [initialSessionId]);

  const navigateStep = useCallback((step: ExternalCandidateToOpStepKey) => {
    setCurrentStep(step);
    window.history.pushState({ matchStep: 'external-candidate-to-op', externalStep: step }, '');
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.externalStep) {
        setCurrentStep(e.state.externalStep);
        setDetailMatch(null);
        setDetailEmployee(null);
        setDetailPosition(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const completeStep = useCallback((step: ExternalCandidateToOpStepKey) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const handleUploadNext = useCallback((resumes: ExternalResumeFile[]) => {
    setUploadedResumes(resumes);
    completeStep('upload');
    navigateStep('position');
  }, [completeStep, navigateStep]);

  const handlePositionNext = useCallback((
    position: BenchOpenPosition | null,
    custom: { name: string; jd: string } | null,
  ) => {
    setSelectedPosition(position);
    setCustomPosition(custom);
    completeStep('position');
    navigateStep('summary');
  }, [completeStep, navigateStep]);

  const handleSummaryNext = useCallback(() => {
    if (!selectedPosition && !customPosition) return;
    const now = new Date();
    const defaultName = `External Candidate to OP — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setSessionName(defaultName);
    setShowSessionNamePrompt(true);
  }, [selectedPosition, customPosition]);

  const executeExternalCandidateMatch = useCallback(async () => {
    if (!selectedPosition && !customPosition) return;
    setShowSessionNamePrompt(false);
    completeStep('summary');
    navigateStep('analyzing');
    setProgress({ percent: 0, stage: '' });
    setError(null);

    try {
      const matchPromptConfigs = getMatchPrompts();
      const opusConfig = matchPromptConfigs.find(p => p.key === 'opus-analysis');

      const parsedResumes = uploadedResumes.filter(r => r.status === 'parsed' && r.text);

      const result = await benchBurnService.executeExternalCandidateMatch(
        {
          name: sessionName || 'External Candidate to OP',
          matchFlowType: 'external-candidate-to-op',
          positionUpstreamIds: selectedPosition ? [selectedPosition.upstreamId] : [],
          candidates: parsedResumes.map(r => ({ name: r.name, resumeText: r.text! })),
          customPosition: customPosition
            ? { name: customPosition.name, jobDescription: customPosition.jd }
            : undefined,
          opusPromptConfig: opusConfig ? {
            promptTemplate: opusConfig.contextBlocks
              ? opusConfig.promptTemplate.replace('{{contextBlock}}', opusConfig.contextBlocks.externalCandidate)
              : opusConfig.promptTemplate,
            maxTokens: opusConfig.maxTokens,
            temperature: opusConfig.temperature,
          } : undefined,
        },
        (p) => setProgress(p),
      );
      setResults(result);
      completeStep('analyzing');
      navigateStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      navigateStep('summary');
    }
  }, [selectedPosition, customPosition, uploadedResumes, sessionName, completeStep, navigateStep]);

  const effectivePosition: BenchOpenPosition | null = useMemo(() => {
    if (selectedPosition) return selectedPosition;
    if (customPosition) return {
      upstreamId: -100,
      id: 0,
      account: 'Custom',
      coe: '',
      practice: '',
      stakeholder: '',
      mainSkill: customPosition.name,
      jobTitle: customPosition.name,
      jobDescription: customPosition.jd,
      isVectorized: false,
    };
    return null;
  }, [selectedPosition, customPosition]);

  const handleSelectMatch = useCallback((match: CrossMatchResult) => {
    setDetailMatch(match);
    setDetailEmployee({
      upstreamId: match.employeeUpstreamId,
      name: match.employeeName,
      email: '',
      seniority: 'External',
      mainSkill: '',
      country: '',
      grossMonthlySalary: null,
      salaryCurrency: null,
      lastAccount: null,
      isVectorized: false,
    });
    setDetailPosition(effectivePosition);
  }, [effectivePosition]);

  const handleBackFromDetail = useCallback(() => {
    setDetailMatch(null);
    setDetailEmployee(null);
    setDetailPosition(null);
  }, []);

  const handleStepClick = useCallback((step: ExternalCandidateToOpStepKey) => {
    navigateStep(step);
    if (detailMatch) handleBackFromDetail();
  }, [detailMatch, handleBackFromDetail, navigateStep]);

  const handleFullReset = useCallback(() => {
    setCurrentStep('upload');
    setCompletedSteps(new Set());
    setUploadedResumes([]);
    setSelectedPosition(null);
    setCustomPosition(null);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
    setDetailEmployee(null);
    setDetailPosition(null);
    setSessionName('');
  }, []);

  const handleBackToIntents = useCallback(() => {
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<ExternalCandidateToOpStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<ExternalCandidateToOpStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('upload') && uploadedResumes.length > 0) {
      summaries['upload'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
          </svg>
        ),
        label: `${uploadedResumes.filter(r => r.status === 'parsed').length} resume${uploadedResumes.filter(r => r.status === 'parsed').length !== 1 ? 's' : ''}`,
      };
    }

    if (completedSteps.has('position') && (selectedPosition || customPosition)) {
      summaries['position'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
          </svg>
        ),
        label: selectedPosition
          ? (selectedPosition.jobTitle || selectedPosition.mainSkill)
          : `Custom: ${customPosition!.name}`,
      };
    }

    if (completedSteps.has('summary')) {
      const pairs = uploadedResumes.filter(r => r.status === 'parsed').length;
      summaries['summary'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        label: `${pairs} pair${pairs !== 1 ? 's' : ''}`,
      };
    }

    return summaries;
  }, [completedSteps, uploadedResumes, selectedPosition, customPosition]);

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
    );
  }

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
