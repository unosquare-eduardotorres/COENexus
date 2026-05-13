import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DeliveryToOpStepKey,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import DeliveryEmployeeSelector from '../components/match/DeliveryEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import DeliveryToOpSummary from '../components/match/DeliveryToOpSummary';
import SearchProgressComponent from '../components/match/SearchProgress';
import DeliveryToOpResults from '../components/match/DeliveryToOpResults';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import { useStepWizard } from './useStepWizard';
import { STEP_ICONS } from '../../../shared/components/icons/stepIcons';

const log = createRendererLogger('useDeliveryToOp');

export function useDeliveryToOp(parentReset: () => void, propSessionId?: number | null) {
  const initialSessionId = useMemo(() => {
    if (propSessionId != null) return propSessionId;
    const rawSessionId = new URLSearchParams(window.location.search).get('session');
    if (!rawSessionId) return null;
    const parsed = parseInt(rawSessionId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [propSessionId]);

  const {
    data: initialSession,
    error: initialSessionError,
  } = useIpcQuery(
    ['delivery-to-op', 'session', String(initialSessionId ?? '')],
    () => benchBurnService.getSession(initialSessionId as number),
    { enabled: initialSessionId !== null },
  );

  const { currentStep, completedSteps, navigateStep, completeStep, setCurrentStep, setCompletedSteps, resetWizard } = useStepWizard<DeliveryToOpStepKey>('employee', {
    historyKey: 'deliveryStep',
    onPopState: () => {
      setDetailMatch(null);
      setDetailEmployee(null);
      setDetailPosition(null);
    },
  });

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
    if (!initialSession) return;
    setResults(initialSession);
    const firstEmpId = Object.keys(initialSession.employeeResults)[0];
    const firstMatch = firstEmpId ? initialSession.employeeResults[Number(firstEmpId)]?.[0] : null;
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
  }, [initialSession]);

  useEffect(() => {
    if (!initialSessionError) return;
    log.error('Failed to load delivery-to-op session:', initialSessionError);
    setError(initialSessionError instanceof Error ? initialSessionError.message : 'Failed to load session');
  }, [initialSessionError]);


  const handleEmployeeNext = useCallback((employee: BenchEmployee) => {
    log.info('Delivery-to-OP employee selected', { upstreamId: employee.upstreamId });
    setSelectedEmployee(employee);
    completeStep('employee');
    navigateStep('positions');
  }, [completeStep, navigateStep]);

  const handlePositionsNext = useCallback((positions: BenchOpenPosition[], custom: { name: string; jd: string }[]) => {
    log.info('Delivery-to-OP positions selected', { positions: positions.length, customPositions: custom.length });
    setSelectedPositions(positions);
    setCustomPositions(custom);
    completeStep('positions');
    navigateStep('summary');
  }, [completeStep, navigateStep]);

  const handleSummaryNext = useCallback(() => {
    if (!selectedEmployee) return;
    log.info('Delivery-to-OP summary confirmed', {
      employeeId: selectedEmployee.upstreamId,
      positionCount: selectedPositions.length + customPositions.length,
    });
    const now = new Date();
    const defaultName = `Delivery Professional to OP — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setSessionName(defaultName);
    setShowSessionNamePrompt(true);
  }, [customPositions.length, selectedEmployee, selectedPositions.length]);

  const executeDeliveryToOp = useCallback(async () => {
    if (!selectedEmployee) return;
    log.info('Delivery-to-OP analysis started', {
      employeeId: selectedEmployee.upstreamId,
      positionCount: selectedPositions.length + customPositions.length,
      sessionName,
    });
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
      log.info('Delivery-to-OP analysis completed', {
        sessionId: result.sessionId,
        employeeGroups: Object.keys(result.employeeResults).length,
      });
      completeStep('analyzing');
      navigateStep('results');
    } catch (err) {
      log.error('Delivery-to-OP analysis failed', err);
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
    log.info('Delivery-to-OP fallback retry started', { pairCount: uniquePairs.length });

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
      log.info('Delivery-to-OP fallback retry completed', { sessionId: retryResult.sessionId });
      navigateStep('results');
    } catch (err) {
      log.error('Delivery-to-OP fallback retry failed', err);
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
    log.info('Delivery-to-OP flow reset');
    resetWizard('employee');
    setSelectedEmployee(null);
    setSelectedPositions([]);
    setCustomPositions([]);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
    setSessionName('');
  }, [resetWizard]);

  const handleBackToIntents = useCallback(() => {
    log.info('Delivery-to-OP flow returned to intents');
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<DeliveryToOpStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<DeliveryToOpStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('employee') && selectedEmployee) {
      summaries['employee'] = {
        icon: STEP_ICONS.person,
        label: selectedEmployee.name,
      };
    }

    if (completedSteps.has('positions')) {
      const total = selectedPositions.length + customPositions.length;
      summaries['positions'] = {
        icon: STEP_ICONS.building,
        label: `${total} positions`,
      };
    }

    if (completedSteps.has('summary')) {
      const pairs = selectedPositions.length + customPositions.length;
      summaries['summary'] = {
        icon: STEP_ICONS.lightning,
        label: `${pairs} pairs`,
      };
    }

    return summaries;
  }, [completedSteps, selectedEmployee, selectedPositions.length, customPositions.length]);

  return {
    wizard: { currentStep, completedSteps, stepSummaries },
    employee: { selectedEmployee, handleEmployeeNext },
    positions: { selectedPositions, handlePositionsNext },
    summary: { customPositions, setCustomPositions, handleSummaryNext, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeDeliveryToOp },
    results: { results, handleRetryFallbacks },
    detail: { detailMatch, setDetailMatch, detailEmployee, detailPosition, handleSelectMatch, handleBackFromDetail },
    actions: { handleReset: handleFullReset, handleStepClick, handleBackToIntents },
  };
}
