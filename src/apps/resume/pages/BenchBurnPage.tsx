import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  BenchBurnStepKey,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import StepperBar from '../components/shared/StepperBar';
import BenchEmployeeSelector from '../components/match/BenchEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import BenchBurnSearchDepth from '../components/match/BenchBurnSearchDepth';
import SearchProgressComponent from '../components/match/SearchProgress';
import BenchBurnResults from '../components/match/BenchBurnResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { getMatchPrompts } from '../data/defaultMatchPrompts';

interface BenchBurnPageProps {
  onReset: () => void;
}

const STEP_LABELS: { key: BenchBurnStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'data-source',
    title: 'Employees',
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
    key: 'search-depth',
    title: 'Summary',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: 'searching',
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

export default function BenchBurnPage({ onReset: parentReset }: BenchBurnPageProps) {
  const [currentStep, setCurrentStep] = useState<BenchBurnStepKey>('data-source');
  const [completedSteps, setCompletedSteps] = useState<Set<BenchBurnStepKey>>(new Set());

  const [selectedEmployees, setSelectedEmployees] = useState<BenchEmployee[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<BenchOpenPosition[]>([]);
  const [customPositions, setCustomPositions] = useState<{ name: string; jd: string }[]>([]);
  const [progress, setProgress] = useState<SearchProgressType>({ percent: 0, stage: '' });
  const [results, setResults] = useState<BenchBurnSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showSessionNamePrompt, setShowSessionNamePrompt] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const [detailMatch, setDetailMatch] = useState<CrossMatchResult | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<BenchEmployee | null>(null);
  const [detailPosition, setDetailPosition] = useState<BenchOpenPosition | null>(null);

  const navigateStep = useCallback((step: BenchBurnStepKey) => {
    setCurrentStep(step);
    window.history.pushState({ matchStep: 'bench-burn', benchStep: step }, '');
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.benchStep) {
        setCurrentStep(e.state.benchStep);
        setDetailMatch(null);
        setDetailEmployee(null);
        setDetailPosition(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const completeStep = useCallback((step: BenchBurnStepKey) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const handleEmployeesNext = useCallback((employees: BenchEmployee[]) => {
    setSelectedEmployees(employees);
    completeStep('data-source');
    navigateStep('positions');
  }, [completeStep, navigateStep]);

  const handlePositionsNext = useCallback((positions: BenchOpenPosition[], custom: { name: string; jd: string }[]) => {
    setSelectedPositions(positions);
    setCustomPositions(custom);
    completeStep('positions');
    navigateStep('search-depth');
  }, [completeStep, navigateStep]);

  const handleSearchDepthNext = useCallback(() => {
    const now = new Date();
    const defaultName = `Bench Burn — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setSessionName(defaultName);
    setShowSessionNamePrompt(true);
  }, []);

  const executeBenchBurn = useCallback(async () => {
    setShowSessionNamePrompt(false);
    completeStep('search-depth');
    navigateStep('searching');
    setProgress({ percent: 0, stage: '' });
    setError(null);

    try {
      const matchPromptConfigs = getMatchPrompts();
      const opusConfig = matchPromptConfigs.find(p => p.key === 'opus-analysis');

      const result = await benchBurnService.executeBenchBurn(
        {
          name: sessionName,
          employeeUpstreamIds: selectedEmployees.map(e => e.upstreamId),
          positionUpstreamIds: selectedPositions.map(p => p.upstreamId),
          searchMode: 'opus',
          topNPerEmployee: 5,
          topNPerPosition: 3,
          customPositions: customPositions.length > 0
            ? customPositions.map(cp => ({ name: cp.name, jobDescription: cp.jd }))
            : undefined,
          opusPromptConfig: opusConfig ? {
            promptTemplate: opusConfig.contextBlocks
              ? opusConfig.promptTemplate.replace('{{contextBlock}}', opusConfig.contextBlocks.benchBurn)
              : opusConfig.promptTemplate,
            maxTokens: opusConfig.maxTokens,
            temperature: opusConfig.temperature,
          } : undefined,
        },
        (p) => setProgress(p),
      );
      setResults(result);
      completeStep('searching');
      navigateStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      navigateStep('search-depth');
    }
  }, [sessionName, selectedEmployees, selectedPositions, customPositions, completeStep, navigateStep]);

  const handleRetryFallbacks = useCallback(async () => {
    if (!results?.stats.candidateTimings) return;
    const fallbackPairs = results.stats.candidateTimings
      .filter(ct => ct.fallback)
      .map(ct => {
        const allMatches = [
          ...Object.values(results.employeeResults).flat(),
          ...Object.values(results.positionResults).flat(),
        ];
        const match = allMatches.find(m => {
          const label = `${m.employeeName} × ${m.positionLabel}`;
          return label === ct.name;
        });
        return match
          ? { employeeUpstreamId: match.employeeUpstreamId, positionUpstreamId: match.positionUpstreamId }
          : null;
      })
      .filter((p): p is { employeeUpstreamId: number; positionUpstreamId: number } => p !== null);

    const uniquePairs = Array.from(
      new Map(fallbackPairs.map(p => [`${p.employeeUpstreamId}-${p.positionUpstreamId}`, p])).values()
    );

    if (uniquePairs.length === 0) return;

    navigateStep('searching');
    setProgress({ percent: 0, stage: '' });
    setError(null);

    try {
      const retryResult = await benchBurnService.retryFallbacks(
        results.sessionId,
        uniquePairs,
        (p) => setProgress(p),
      );
      setResults(retryResult);
      navigateStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
      navigateStep('results');
    }
  }, [results, navigateStep]);

  const handleSelectMatch = useCallback((match: CrossMatchResult, emp: BenchEmployee, pos: BenchOpenPosition) => {
    setDetailMatch(match);
    setDetailEmployee(emp);
    setDetailPosition(pos);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setDetailMatch(null);
    setDetailEmployee(null);
    setDetailPosition(null);
  }, []);

  const handleStepClick = useCallback((step: BenchBurnStepKey) => {
    navigateStep(step);
    if (detailMatch) handleBackFromDetail();
  }, [detailMatch, handleBackFromDetail, navigateStep]);

  const handleFullReset = useCallback(() => {
    setCurrentStep('data-source');
    setCompletedSteps(new Set());
    setSelectedEmployees([]);
    setSelectedPositions([]);
    setCustomPositions([]);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
  }, []);

  const handleBackToIntents = useCallback(() => {
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<BenchBurnStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<BenchBurnStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('data-source')) {
      summaries['data-source'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        label: `${selectedEmployees.length} employees`,
      };
    }

    if (completedSteps.has('positions')) {
      const total = selectedPositions.length + customPositions.length;
      summaries['positions'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
          </svg>
        ),
        label: `${total} positions`,
      };
    }

    if (completedSteps.has('search-depth')) {
      const pairs = selectedEmployees.length * (selectedPositions.length + customPositions.length);
      summaries['search-depth'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        label: `${pairs} pairs`,
      };
    }

    return summaries;
  }, [completedSteps, selectedEmployees.length, selectedPositions.length, customPositions.length]);

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

      {currentStep === 'data-source' && (
        <BenchEmployeeSelector
          onNext={handleEmployeesNext}
          initialSelected={selectedEmployees}
        />
      )}

      {currentStep === 'positions' && (
        <BenchPositionSelector
          onNext={handlePositionsNext}
          initialSelected={selectedPositions}
          initialCustom={customPositions}
        />
      )}

      {currentStep === 'search-depth' && (
        <BenchBurnSearchDepth
          employeeCount={selectedEmployees.length}
          positionCount={selectedPositions.length + customPositions.length}
          onNext={handleSearchDepthNext}
        />
      )}

      {currentStep === 'searching' && (
        <SearchProgressComponent progress={progress} />
      )}

      {currentStep === 'results' && results && (
        <BenchBurnResults
          results={results}
          employees={selectedEmployees}
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
            <p className="text-sm text-secondary mb-4">Give this bench burn session a name so you can find it later.</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeBenchBurn()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="e.g., Bench Burn — March 2026"
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
                onClick={executeBenchBurn}
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
