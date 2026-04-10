import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  BenchBurnStepKey,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import StepperBar from '../../../shared/components/StepperBar';
import BenchEmployeeSelector from '../components/match/BenchEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import BenchBurnSearchDepth from '../components/match/BenchBurnSearchDepth';
import SearchProgressComponent from '../components/match/SearchProgress';
import BenchBurnResults from '../components/match/BenchBurnResults';
import BenchBurnDetailPanel from '../components/match/BenchBurnDetailPanel';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import { useStepWizard } from './useStepWizard';
import { STEP_ICONS } from '../../../shared/components/icons/stepIcons';

export function useBenchBurn(parentReset?: () => void) {
  const initialSessionId = useMemo(() => {
    const rawSessionId = new URLSearchParams(window.location.search).get('session');
    if (!rawSessionId) return null;
    const parsed = parseInt(rawSessionId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);

  const {
    data: initialSession,
    error: initialSessionError,
  } = useIpcQuery(
    ['bench-burn', 'session', String(initialSessionId ?? '')],
    () => benchBurnService.getSession(initialSessionId as number),
    { enabled: initialSessionId !== null },
  );

  const { currentStep, completedSteps, navigateStep, completeStep, setCurrentStep, setCompletedSteps, resetWizard } = useStepWizard<BenchBurnStepKey>('data-source', {
    historyKey: 'benchStep',
    onPopState: () => {
      setDetailMatch(null);
      setDetailEmployee(null);
      setDetailPosition(null);
    },
  });

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

  useEffect(() => {
    if (!initialSession) return;
    setResults(initialSession);
    setCompletedSteps(new Set<BenchBurnStepKey>(['data-source', 'positions', 'search-depth', 'searching']));
    setCurrentStep('results');
  }, [initialSession]);

  useEffect(() => {
    if (!initialSessionError) return;
    setError(initialSessionError instanceof Error ? initialSessionError.message : 'Failed to load session');
  }, [initialSessionError]);


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
    resetWizard('data-source');
    setSelectedEmployees([]);
    setSelectedPositions([]);
    setCustomPositions([]);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
  }, [resetWizard]);

  const handleBackToIntents = useCallback(() => {
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<BenchBurnStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<BenchBurnStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('data-source')) {
      summaries['data-source'] = {
        icon: STEP_ICONS.person,
        label: `${selectedEmployees.length} employees`,
      };
    }

    if (completedSteps.has('positions')) {
      const total = selectedPositions.length + customPositions.length;
      summaries['positions'] = {
        icon: STEP_ICONS.building,
        label: `${total} positions`,
      };
    }

    if (completedSteps.has('search-depth')) {
      const pairs = selectedEmployees.length * (selectedPositions.length + customPositions.length);
      summaries['search-depth'] = {
        icon: STEP_ICONS.lightning,
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


  return {
    wizard: { currentStep, completedSteps },
    employees: { selectedEmployees, handleEmployeesNext },
    positions: { selectedPositions, handlePositionsNext },
    search: { progress, error, handleSearchDepthNext, executeBenchBurn, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    results: { results, handleRetryFallbacks, handleExportToExcel },
    detail: { detailMatch, setDetailMatch, detailEmployee, setDetailEmployee, detailPosition, setDetailPosition, handleShowDetail },
    actions: { handleReset, handleStepClick },
  };
}
