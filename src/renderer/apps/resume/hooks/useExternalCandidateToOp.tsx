import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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
import { createRendererLogger } from '../utils/rendererLogger';
import { useIpcQuery } from '../../../hooks/useIpcQuery';
import { useStepWizard } from './useStepWizard';
import { STEP_ICONS } from '../components/shared/icons/stepIcons';

const log = createRendererLogger('useExternalCandidateToOp');

export function useExternalCandidateToOp(parentReset: () => void) {
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
    ['external-candidate-to-op', 'session', String(initialSessionId ?? '')],
    () => benchBurnService.getSession(initialSessionId as number),
    { enabled: initialSessionId !== null },
  );

  const { currentStep, completedSteps, navigateStep, completeStep, setCurrentStep, setCompletedSteps, resetWizard } = useStepWizard<ExternalCandidateToOpStepKey>('upload', {
    historyKey: 'externalStep',
    onPopState: () => {
      setDetailMatch(null);
      setDetailEmployee(null);
      setDetailPosition(null);
    },
  });

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
    if (!initialSession) return;
    setResults(initialSession);
    setCompletedSteps(new Set<ExternalCandidateToOpStepKey>(['upload', 'position', 'summary', 'analyzing']));
    setCurrentStep('results');
  }, [initialSession]);

  useEffect(() => {
    if (!initialSessionError) return;
    log.error('Failed to load external-candidate-to-op session:', initialSessionError);
    setError(initialSessionError instanceof Error ? initialSessionError.message : 'Failed to load session');
  }, [initialSessionError]);


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
    resetWizard('upload');
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
  }, [resetWizard]);

  const handleBackToIntents = useCallback(() => {
    parentReset();
  }, [parentReset]);

  const stepSummaries = useMemo<Partial<Record<ExternalCandidateToOpStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<ExternalCandidateToOpStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('upload') && uploadedResumes.length > 0) {
      summaries['upload'] = {
        icon: STEP_ICONS.cloud,
        label: `${uploadedResumes.filter(r => r.status === 'parsed').length} resume${uploadedResumes.filter(r => r.status === 'parsed').length !== 1 ? 's' : ''}`,
      };
    }

    if (completedSteps.has('position') && (selectedPosition || customPosition)) {
      summaries['position'] = {
        icon: STEP_ICONS.building,
        label: selectedPosition
          ? (selectedPosition.jobTitle || selectedPosition.mainSkill)
          : `Custom: ${customPosition!.name}`,
      };
    }

    if (completedSteps.has('summary')) {
      const pairs = uploadedResumes.filter(r => r.status === 'parsed').length;
      summaries['summary'] = {
        icon: STEP_ICONS.lightning,
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


  return {
    wizard: { currentStep, completedSteps, stepSummaries },
    upload: { uploadedFiles, handleFilesUploaded },
    positions: { selectedPositions, customPosition, handlePositionsNext },
    summary: { handleStartAnalysis, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeSearch },
    results: { results, handleExportToExcel },
    detail: { detailMatch, setDetailMatch, detailEmployee, detailPosition, handleShowDetail },
    actions: { handleReset, handleStepClick },
  };
}
