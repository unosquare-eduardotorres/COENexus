import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  BenchBurnStepKey,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
} from '../types';
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService';
import { exportToExcel, ColumnDef } from '../utils/exportToExcel';
import BenchEmployeeSelector from '../components/match/BenchEmployeeSelector';
import BenchPositionSelector from '../components/match/BenchPositionSelector';
import BenchBurnSearchDepth from '../components/match/BenchBurnSearchDepth';
import SearchProgressComponent from '../components/match/SearchProgress';
import BenchBurnResults from '../components/match/BenchBurnResults';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import { useStepWizard } from './useStepWizard';
import { STEP_ICONS } from '../../../shared/components/icons/stepIcons';
import { useToast } from '../../../shared/components/ToastContext';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('useBenchBurn');

export function useBenchBurn(parentReset?: () => void, propSessionId?: number | null) {
  const { showToast } = useToast();
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
    log.info('Bench burn session loaded from URL', { sessionId: initialSession.sessionId });
    setResults(initialSession);
    setCompletedSteps(new Set<BenchBurnStepKey>(['data-source', 'positions', 'search-depth', 'searching']));
    setCurrentStep('results');
  }, [initialSession]);

  useEffect(() => {
    if (!initialSessionError) return;
    log.error('Bench burn session load failed', initialSessionError);
    setError(initialSessionError instanceof Error ? initialSessionError.message : 'Failed to load session');
  }, [initialSessionError]);


  const handleEmployeesNext = useCallback((employees: BenchEmployee[]) => {
    log.info('Bench burn employees selected', { count: employees.length });
    setSelectedEmployees(employees);
    completeStep('data-source');
    navigateStep('positions');
  }, [completeStep, navigateStep]);

  const handlePositionsNext = useCallback((positions: BenchOpenPosition[], custom: { name: string; jd: string }[]) => {
    log.info('Bench burn positions selected', { positions: positions.length, customPositions: custom.length });
    setSelectedPositions(positions);
    setCustomPositions(custom);
    completeStep('positions');
    navigateStep('search-depth');
  }, [completeStep, navigateStep]);

  const handleSearchDepthNext = useCallback(() => {
    log.info('Bench burn summary confirmed', {
      employeeCount: selectedEmployees.length,
      positionCount: selectedPositions.length + customPositions.length,
    });
    const now = new Date();
    const defaultName = `Bench Burn — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setSessionName(defaultName);
    setShowSessionNamePrompt(true);
  }, [customPositions.length, selectedEmployees.length, selectedPositions.length]);

  const executeBenchBurn = useCallback(async () => {
    log.info('Bench burn analysis started', {
      employeeCount: selectedEmployees.length,
      positionCount: selectedPositions.length + customPositions.length,
      sessionName,
    });
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
      log.info('Bench burn analysis completed', {
        sessionId: result.sessionId,
        employeeResultGroups: Object.keys(result.employeeResults).length,
        positionResultGroups: Object.keys(result.positionResults).length,
      });
      completeStep('searching');
      navigateStep('results');
    } catch (err) {
      log.error('Bench burn analysis failed', err);
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
    log.info('Bench burn fallback retry started', { pairCount: uniquePairs.length });

    navigateStep('searching');
    setProgress({ percent: 0, stage: '' });
    setError(null);

    try {
      const retryResult = await benchBurnService.retryFallbacks(
        { sessionId: results.sessionId, pairs: uniquePairs },
        (p) => setProgress(p),
      );
      setResults(retryResult);
      log.info('Bench burn fallback retry completed', { sessionId: retryResult.sessionId });
      navigateStep('results');
    } catch (err) {
      log.error('Bench burn fallback retry failed', err);
      setError(err instanceof Error ? err.message : 'Retry failed');
      navigateStep('results');
    }
  }, [results, navigateStep]);

  const handleExportToExcel = useCallback(() => {
    if (!results) return;
    const allMatches: CrossMatchResult[] = [
      ...Object.values(results.employeeResults).flat(),
    ];
    const seen = new Set<string>();
    const uniqueMatches = allMatches.filter((m) => {
      const key = `${m.employeeUpstreamId}-${m.positionUpstreamId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const columns: ColumnDef[] = [
      { header: 'Employee', key: 'employeeName' },
      { header: 'Position', key: 'positionLabel' },
      { header: 'Match Score', key: 'matchScore', type: 'score' },
      { header: 'Cosine Similarity', key: 'cosineSimilarity', type: 'score' },
      { header: 'Technical %', key: 'technical', type: 'score' },
      { header: 'Domain %', key: 'domain', type: 'score' },
      { header: 'Leadership %', key: 'leadership', type: 'score' },
      { header: 'Soft Skills %', key: 'softSkills', type: 'score' },
      { header: 'Availability %', key: 'availability', type: 'score' },
      { header: 'Summary', key: 'summary' },
    ];
    const data = uniqueMatches.map((m) => ({
      employeeName: m.employeeName,
      positionLabel: m.positionLabel,
      matchScore: m.matchScore,
      cosineSimilarity: m.cosineSimilarity,
      technical: m.scores.technical,
      domain: m.scores.domain,
      leadership: m.scores.leadership,
      softSkills: m.scores.softSkills,
      availability: m.scores.availability,
      summary: m.summary,
    }));
    exportToExcel(data, columns, `bench-burn-results-${new Date().toISOString().slice(0, 10)}.xlsx`);
    log.info('Bench burn results exported', { rowCount: data.length });
    showToast('Bench burn results exported to Excel', 'success');
  }, [results, showToast]);

  const handleShowDetail = useCallback((match: CrossMatchResult, emp: BenchEmployee, pos: BenchOpenPosition) => {
    setDetailMatch(match);
    setDetailEmployee(emp);
    setDetailPosition(pos);
  }, []);

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
    log.info('Bench burn flow reset');
    resetWizard('data-source');
    setSelectedEmployees([]);
    setSelectedPositions([]);
    setCustomPositions([]);
    setProgress({ percent: 0, stage: '' });
    setResults(null);
    setError(null);
    setDetailMatch(null);
  }, [resetWizard]);

  const handleReset = handleFullReset;

  const handleBackToIntents = useCallback(() => {
    log.info('Bench burn flow returned to intents');
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

  return {
    wizard: { currentStep, completedSteps, stepSummaries },
    employees: { selectedEmployees, handleEmployeesNext },
    positions: { selectedPositions, customPositions, handlePositionsNext },
    search: { progress, error, handleSearchDepthNext, executeBenchBurn, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    results: { results, handleRetryFallbacks, handleExportToExcel },
    detail: { detailMatch, setDetailMatch, detailEmployee, setDetailEmployee, detailPosition, setDetailPosition, handleShowDetail, handleSelectMatch, handleBackFromDetail },
    actions: { handleReset, handleStepClick, handleBackToIntents },
  };
}
