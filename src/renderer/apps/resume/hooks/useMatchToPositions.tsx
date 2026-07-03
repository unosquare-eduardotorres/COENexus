import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MatchToPositionsStepKey,
  MatchToPositionsPerson,
  BenchEmployee,
  BenchOpenPosition,
  CrossMatchResult,
  SearchProgress as SearchProgressType,
  MatchToPositionsRequest,
} from '../types'
import { BenchBurnSearchResult, benchBurnService } from '../services/benchBurnService'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery'
import { useStepWizard } from './useStepWizard'
import { STEP_ICONS } from '../../../shared/components/icons/stepIcons'

const log = createRendererLogger('useMatchToPositions')

export function useMatchToPositions(parentReset: () => void, propSessionId?: number | null) {
  const initialSessionId = useMemo(() => {
    if (propSessionId != null) return propSessionId
    const rawSessionId = new URLSearchParams(window.location.search).get('session')
    if (!rawSessionId) return null
    const parsed = parseInt(rawSessionId, 10)
    return Number.isNaN(parsed) ? null : parsed
  }, [propSessionId])

  const {
    data: initialSession,
    error: initialSessionError,
  } = useIpcQuery(
    ['match-to-positions', 'session', String(initialSessionId ?? '')],
    () => benchBurnService.getSession(initialSessionId as number),
    { enabled: initialSessionId !== null },
  )

  const { currentStep, completedSteps, navigateStep, completeStep, setCurrentStep, setCompletedSteps, resetWizard } = useStepWizard<MatchToPositionsStepKey>('select-person', {
    historyKey: 'matchToPosStep',
    onPopState: () => {
      setDetailMatch(null)
      setDetailEmployee(null)
      setDetailPosition(null)
    },
  })

  const [selectedPerson, setSelectedPerson] = useState<MatchToPositionsPerson | null>(null)
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([])
  const [customPositions, setCustomPositions] = useState<{ name: string; jd: string }[]>([])
  const [progress, setProgress] = useState<SearchProgressType>({ percent: 0, stage: '' })
  const [results, setResults] = useState<BenchBurnSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showSessionNamePrompt, setShowSessionNamePrompt] = useState(false)
  const [sessionName, setSessionName] = useState('')

  const [detailMatch, setDetailMatch] = useState<CrossMatchResult | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<BenchEmployee | null>(null)
  const [detailPosition, setDetailPosition] = useState<BenchOpenPosition | null>(null)

  useEffect(() => {
    if (!initialSession) return
    setResults(initialSession)
    const firstEmpId = Object.keys(initialSession.employeeResults)[0]
    const firstMatch = firstEmpId ? initialSession.employeeResults[Number(firstEmpId)]?.[0] : null
    if (firstMatch) {
      setSelectedPerson({
        sourceType: 'candidate',
        upstreamId: firstMatch.employeeUpstreamId,
        name: firstMatch.employeeName,
        seniority: '',
        mainSkill: '',
        country: '',
      })
    }
    setCompletedSteps(new Set<MatchToPositionsStepKey>(['select-person', 'position-ranking', 'summary', 'analyzing']))
    setCurrentStep('results')
  }, [initialSession])

  useEffect(() => {
    if (!initialSessionError) return
    log.error('Failed to load match-to-positions session:', initialSessionError)
    setError(initialSessionError instanceof Error ? initialSessionError.message : 'Failed to load session')
  }, [initialSessionError])

  const handlePersonNext = useCallback((person: MatchToPositionsPerson) => {
    log.info('Match-to-positions person selected', { sourceType: person.sourceType, upstreamId: person.upstreamId })
    setSelectedPerson(person)
    completeStep('select-person')
    navigateStep('position-ranking')
  }, [completeStep, navigateStep])

  const handlePositionsConfirm = useCallback((ids: number[], custom: { name: string; jd: string }[]) => {
    log.info('Match-to-positions positions confirmed', { positions: ids.length, customPositions: custom.length })
    setSelectedPositionIds(ids)
    setCustomPositions(custom)
    completeStep('position-ranking')
    navigateStep('summary')
  }, [completeStep, navigateStep])

  const handleSummaryNext = useCallback(() => {
    if (!selectedPerson) return
    const now = new Date()
    const defaultName = `Match to Positions — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    setSessionName(defaultName)
    setShowSessionNamePrompt(true)
  }, [selectedPerson])

  const executeAnalysis = useCallback(async () => {
    if (!selectedPerson) return
    log.info('Match-to-positions analysis started', {
      personSourceType: selectedPerson.sourceType,
      positionCount: selectedPositionIds.length + customPositions.length,
      sessionName,
    })
    setShowSessionNamePrompt(false)
    completeStep('summary')
    navigateStep('analyzing')
    setProgress({ percent: 0, stage: '' })
    setError(null)

    try {
      const request: MatchToPositionsRequest = {
        name: sessionName || `Match to Positions — ${selectedPerson.name}`,
        matchFlowType: 'match-to-positions',
        personSourceType: selectedPerson.sourceType,
        upstreamId: selectedPerson.upstreamId || undefined,
        candidateName: selectedPerson.sourceType === 'external' ? selectedPerson.name : undefined,
        resumeText: selectedPerson.resumeText,
        positionUpstreamIds: selectedPositionIds,
        customPositions: customPositions.length > 0
          ? customPositions.map(cp => ({ name: cp.name, jobDescription: cp.jd }))
          : undefined,
      }

      const result = await benchBurnService.executeMatchToPositions(request, (p) => setProgress(p))
      setResults(result)
      log.info('Match-to-positions analysis completed', {
        sessionId: result.sessionId,
        employeeGroups: Object.keys(result.employeeResults).length,
      })
      completeStep('analyzing')
      navigateStep('results')
    } catch (err) {
      log.error('Match-to-positions analysis failed', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
      navigateStep('summary')
    }
  }, [selectedPerson, selectedPositionIds, customPositions, sessionName, completeStep, navigateStep])

  const handleRetryFallbacks = useCallback(async () => {
    if (!results?.stats.candidateTimings) return
    const fallbackPairs = results.stats.candidateTimings
      .filter(ct => ct.fallback)
      .map(ct => {
        const allMatches = Object.values(results.employeeResults).flat()
        const match = allMatches.find(m => {
          const label = `${m.employeeName} × ${m.positionLabel}`
          return label === ct.name
        })
        return match
          ? { employeeUpstreamId: match.employeeUpstreamId, positionUpstreamId: match.positionUpstreamId }
          : null
      })
      .filter((p): p is { employeeUpstreamId: number; positionUpstreamId: number } => p !== null)

    const uniquePairs = Array.from(
      new Map(fallbackPairs.map(p => [`${p.employeeUpstreamId}-${p.positionUpstreamId}`, p])).values()
    )

    if (uniquePairs.length === 0) return
    log.info('Match-to-positions fallback retry started', { pairCount: uniquePairs.length })

    navigateStep('analyzing')
    setProgress({ percent: 0, stage: '' })
    setError(null)

    try {
      const retryResult = await benchBurnService.retryFallbacks(
        { sessionId: results.sessionId, pairs: uniquePairs },
        (p) => setProgress(p),
      )
      setResults(retryResult)
      navigateStep('results')
    } catch (err) {
      log.error('Match-to-positions fallback retry failed', err)
      setError(err instanceof Error ? err.message : 'Retry failed')
      navigateStep('results')
    }
  }, [results, navigateStep])

  const handleSelectMatch = useCallback((match: CrossMatchResult, emp: BenchEmployee, pos: BenchOpenPosition) => {
    setDetailMatch(match)
    setDetailEmployee(emp)
    setDetailPosition(pos)
  }, [])

  const handleBackFromDetail = useCallback(() => {
    setDetailMatch(null)
    setDetailEmployee(null)
    setDetailPosition(null)
  }, [])

  const handleStepClick = useCallback((step: MatchToPositionsStepKey) => {
    navigateStep(step)
    if (detailMatch) handleBackFromDetail()
  }, [detailMatch, handleBackFromDetail, navigateStep])

  const handleFullReset = useCallback(() => {
    log.info('Match-to-positions flow reset')
    resetWizard('select-person')
    setSelectedPerson(null)
    setSelectedPositionIds([])
    setCustomPositions([])
    setProgress({ percent: 0, stage: '' })
    setResults(null)
    setError(null)
    setDetailMatch(null)
    setSessionName('')
  }, [resetWizard])

  const handleBackToIntents = useCallback(() => {
    log.info('Match-to-positions flow returned to intents')
    parentReset()
  }, [parentReset])

  const stepSummaries = useMemo<Partial<Record<MatchToPositionsStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<MatchToPositionsStepKey, { icon: ReactNode; label: string } | null>> = {}

    if (completedSteps.has('select-person') && selectedPerson) {
      summaries['select-person'] = {
        icon: STEP_ICONS.person,
        label: selectedPerson.name,
      }
    }

    if (completedSteps.has('position-ranking')) {
      const total = selectedPositionIds.length + customPositions.length
      summaries['position-ranking'] = {
        icon: STEP_ICONS.building,
        label: `${total} positions`,
      }
    }

    if (completedSteps.has('summary')) {
      const pairs = selectedPositionIds.length + customPositions.length
      summaries['summary'] = {
        icon: STEP_ICONS.lightning,
        label: `${pairs} pairs`,
      }
    }

    return summaries
  }, [completedSteps, selectedPerson, selectedPositionIds.length, customPositions.length])

  const adaptedEmployee = useMemo<BenchEmployee | null>(() => {
    if (!selectedPerson) return null
    return {
      upstreamId: selectedPerson.upstreamId,
      name: selectedPerson.name,
      email: '',
      seniority: selectedPerson.seniority,
      mainSkill: selectedPerson.mainSkill,
      country: selectedPerson.country,
      grossMonthlySalary: null,
      salaryCurrency: null,
      lastAccount: null,
      isVectorized: true,
      isBench: selectedPerson.isBench,
    }
  }, [selectedPerson])

  return {
    wizard: { currentStep, completedSteps, stepSummaries },
    person: { selectedPerson, handlePersonNext },
    positions: { selectedPositionIds, customPositions, handlePositionsConfirm },
    summary: { handleSummaryNext, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName },
    search: { progress, error, executeAnalysis },
    results: { results, handleRetryFallbacks },
    detail: { detailMatch, setDetailMatch, detailEmployee, detailPosition, handleSelectMatch, handleBackFromDetail },
    actions: { handleReset: handleFullReset, handleStepClick, handleBackToIntents },
    adaptedEmployee,
  }
}
