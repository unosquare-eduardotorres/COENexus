import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  DeliveryToOpStepKey,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import StepperBar from '../components/shared/StepperBar';
import DeliveryEmployeeSelector from '../components/match/DeliveryEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import DeliveryToOpSummary from '../components/match/DeliveryToOpSummary';
import SearchProgressComponent from '../components/match/SearchProgress';
import DeliveryToOpResults from '../components/match/DeliveryToOpResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { getMatchPrompts } from '../data/defaultMatchPrompts';

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

export default function DeliveryToOpPage({ onReset: parentReset, initialSessionId }: DeliveryToOpPageProps) {
  const [currentStep, setCurrentStep] = useState<DeliveryToOpStepKey>('employee');
  const [completedSteps, setCompletedSteps] = useState<Set<DeliveryToOpStepKey>>(new Set());

  const [selectedEmployee, setSelectedEmployee] = useState<BenchEmployee | null>(null);
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

  useEffect(() => {
    if (!initialSessionId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await benchBurnService.getSession(initialSessionId);
        if (cancelled) return;

        setResults(result);

        const firstEmpId = Object.keys(result.employeeResults)[0];
        const firstMatch = firstEmpId ? result.employeeResults[Number(firstEmpId)]?.[0] : null;
        if (firstMatch) {
          setSelectedEmployee({
            upstreamId: firstMatch.employeeUpstreamId,
            name: firstMatch.employeeName,
            email: '',
            seniority: '',
            mainSkill: '',
            country: '',
            grossMonthlySalary: null,
            salaryCurrency: null,
            lastAccount: null,
            isVectorized: true,
          });
        }

        setCompletedSteps(new Set<DeliveryToOpStepKey>(['employee', 'positions', 'summary', 'analyzing']));
        setCurrentStep('results');
      } catch (err) {
        console.error('Failed to load delivery-to-op session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      }
    })();

    return () => { cancelled = true; };
  }, [initialSessionId]);

  const navigateStep = useCallback((step: DeliveryToOpStepKey) => {
    setCurrentStep(step);
    window.history.pushState({ matchStep: 'delivery-to-op', deliveryStep: step }, '');
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.deliveryStep) {
        setCurrentStep(e.state.deliveryStep);
        setDetailMatch(null);
        setDetailEmployee(null);
        setDetailPosition(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const completeStep = useCallback((step: DeliveryToOpStepKey) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const handleEmployeeNext = useCallback((employee: BenchEmployee) => {
    setSelectedEmployee(employee);
    completeStep('employee');
    navigateStep('positions');
  }, [completeStep, navigateStep]);

  const handlePositionsNext = useCallback((positions: BenchOpenPosition[], custom: { name: string; jd: string }[]) => {
    setSelectedPositions(positions);
    setCustomPositions(custom);
    completeStep('positions');
    navigateStep('summary');
  }, [completeStep, navigateStep]);

  const handleSummaryNext = useCallback(() => {
    if (!selectedEmployee) return;
    const now = new Date();
    const defaultName = `Delivery Professional to OP — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setSessionName(defaultName);
    setShowSessionNamePrompt(true);
  }, [selectedEmployee]);

  const executeDeliveryToOp = useCallback(async () => {
    if (!selectedEmployee) return;
    setShowSessionNamePrompt(false);
    completeStep('summary');
    navigateStep('analyzing');
    setProgress({ percent: 0, stage: '' });
    setError(null);

    try {
      const posCount = selectedPositions.length + customPositions.length;
      const matchPromptConfigs = getMatchPrompts();
      const opusConfig = matchPromptConfigs.find(p => p.key === 'opus-analysis');

      const result = await benchBurnService.executeBenchBurn(
        {
          name: sessionName || `Delivery Professional to OP — ${selectedEmployee.name}`,
          matchFlowType: 'delivery-to-op',
          employeeUpstreamIds: [selectedEmployee.upstreamId],
          positionUpstreamIds: selectedPositions.map(p => p.upstreamId),
          searchMode: 'opus',
          topNPerEmployee: posCount,
          topNPerPosition: 1,
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
      completeStep('analyzing');
      navigateStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      navigateStep('summary');
    }
  }, [selectedEmployee, selectedPositions, customPositions, sessionName, completeStep, navigateStep]);

  const handleRetryFallbacks = useCallback(async () => {
    if (!results?.stats.candidateTimings) return;
    const fallbackPairs = results.stats.candidateTimings
      .filter(ct => ct.fallback)
      .map(ct => {
        const allMatches = Object.values(results.employeeResults).flat();
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

    navigateStep('analyzing');
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

  const handleStepClick = useCallback((step: DeliveryToOpStepKey) => {
    navigateStep(step);
    if (detailMatch) handleBackFromDetail();
  }, [detailMatch, handleBackFromDetail, navigateStep]);

  const handleFullReset = useCallback(() => {
    setCurrentStep('employee');
    setCompletedSteps(new Set());
    setSelectedEmployee(null);
    setSelectedPositions([]);
    setCustomPositions([]);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
    setSessionName('');
  }, []);

  const handleBackToIntents = useCallback(() => {
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<DeliveryToOpStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<DeliveryToOpStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('employee') && selectedEmployee) {
      summaries['employee'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        label: selectedEmployee.name,
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

    if (completedSteps.has('summary')) {
      const pairs = selectedPositions.length + customPositions.length;
      summaries['summary'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        label: `${pairs} pairs`,
      };
    }

    return summaries;
  }, [completedSteps, selectedEmployee, selectedPositions.length, customPositions.length]);

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
