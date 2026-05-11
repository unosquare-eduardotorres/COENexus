import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import AgentStepStream from '../../components/AgentStepStream'
import BraniacRunCard from '../../components/braniac/BraniacRunCard'
import type { SelectionTarget } from '../../components/braniac/BraniacRunCard'
import { braniacService } from '../../services/braniacService'
import type { BraniacProgressInfo, BraniacAnalysisStatusItem } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacPipelineTab')

export default function PipelineTab() {
  const [accountStatuses, setAccountStatuses] = useState<Map<string, BraniacAnalysisStatusItem[]>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<BraniacProgressInfo | null>(null)
  const [batchProgress, setBatchProgress] = useState<{
    current: number; total: number; currentAccount: string
  } | null>(null)
  const batchCancelledRef = useRef(false)
  const [skillsCoverage, setSkillsCoverage] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [accountsRes, statusRes] = await Promise.all([
        braniacService.getAccounts(),
        braniacService.getStatus(),
      ])

      if (statusRes.success && statusRes.data) {
        setIsRunning(statusRes.data.running)
        setCurrentJobId(statusRes.data.job_id)
      }

      braniacService.getExtractionStatus().then(res => {
        if (res.success && res.data && res.data.total > 0) {
          setSkillsCoverage(Math.round((res.data.extracted / res.data.total) * 100))
        }
      }).catch(() => {})

      if (accountsRes.success && accountsRes.data) {
        const statusResults = await Promise.all(
          accountsRes.data.map(account =>
            braniacService.getAnalysisStatus({ account }).then(res => ({
              account,
              items: res.success && res.data ? res.data : [],
            }))
          )
        )
        const statusMap = new Map<string, BraniacAnalysisStatusItem[]>()
        for (const { account, items } of statusResults) {
          statusMap.set(account, items)
        }
        setAccountStatuses(statusMap)
      }
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to load pipeline data', { error: errorMsg })
      setError(errorMsg)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const cleanupStatus = braniacService.onStatusEvent((event) => {
      setIsRunning(event.status === 'running')
      setCurrentJobId(event.job_id)
      if (event.progress) setProgress(event.progress)

      if (event.status === 'completed' || event.status === 'failed') {
        setProgress(null)
        void loadData()
      }
    })

    return cleanupStatus
  }, [loadData])

  const handleRun = useCallback(async (account: string, scope: 'account' | 'stakeholder', stakeholder?: string) => {
    setError(null)
    try {
      const result = await braniacService.run({ scope, account, stakeholder })
      if (result.success && result.data) {
        setIsRunning(true)
        setCurrentJobId(result.data.id)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      const errorMsg = reportError(err)
      setError(errorMsg)
      log.error('Failed to run Braniac', { error: errorMsg })
    }
  }, [])

  const handleCancel = useCallback(async (jobId: string) => {
    try {
      await braniacService.cancel({ job_id: jobId })
      setIsRunning(false)
      setCurrentJobId(null)
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to cancel Braniac', { error: errorMsg })
    }
  }, [])

  const handleRunMulti = useCallback(async (targets: SelectionTarget[]) => {
    if (targets.length === 0) return
    batchCancelledRef.current = false
    setError(null)

    for (let i = 0; i < targets.length; i++) {
      if (batchCancelledRef.current) break
      const target = targets[i]
      const label = target.stakeholder ?? target.account
      setBatchProgress({ current: i + 1, total: targets.length, currentAccount: label })

      try {
        const result = await braniacService.run({
          scope: target.stakeholder ? 'stakeholder' : 'account',
          account: target.account,
          stakeholder: target.stakeholder,
        })
        if (result.success && result.data) {
          setIsRunning(true)
          setCurrentJobId(result.data.id)
          await new Promise<void>((resolve) => {
            const cleanup = braniacService.onStatusEvent((event) => {
              if (event.status === 'completed' || event.status === 'failed') {
                cleanup()
                resolve()
              }
            })
          })
        }
      } catch (err) {
        log.error('Multi-run failed for target', { target, error: reportError(err) })
      }
    }

    setBatchProgress(null)
    setIsRunning(false)
    void loadData()
  }, [loadData])

  const handleRunAll = useCallback(async (skipUpToDate: boolean) => {
    const accounts = [...accountStatuses.keys()]
    if (accounts.length === 0) return
    batchCancelledRef.current = false
    setError(null)

    let accountsToProcess = accounts
    if (skipUpToDate) {
      const accountsWithNewData = accounts.filter(account => {
        const items = accountStatuses.get(account)
        if (!items) return true
        return items.some(s => s.hasNewData)
      })
      accountsToProcess = accountsWithNewData
      if (accountsToProcess.length === 0) {
        setError('All accounts are up to date — no new data to analyze.')
        return
      }
    }

    for (let i = 0; i < accountsToProcess.length; i++) {
      if (batchCancelledRef.current) break
      const account = accountsToProcess[i]
      setBatchProgress({ current: i + 1, total: accountsToProcess.length, currentAccount: account })

      try {
        const result = await braniacService.run({ scope: 'account', account })
        if (result.success && result.data) {
          setIsRunning(true)
          setCurrentJobId(result.data.id)

          await new Promise<void>((resolve) => {
            const cleanup = braniacService.onStatusEvent((event) => {
              if (event.status === 'completed' || event.status === 'failed') {
                cleanup()
                resolve()
              }
            })
          })
        }
      } catch (err) {
        log.error('Batch run failed for account', { account, error: reportError(err) })
      }
    }

    setBatchProgress(null)
    setIsRunning(false)
    void loadData()
  }, [accountStatuses, loadData])

  const handleCancelBatch = useCallback(() => {
    batchCancelledRef.current = true
    if (currentJobId) void handleCancel(currentJobId)
    setBatchProgress(null)
  }, [currentJobId, handleCancel])

  return (
    <div className="space-y-4">
      {skillsCoverage !== null && skillsCoverage < 50 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Braniac skill analysis quality is limited — only {skillsCoverage}% of candidate resumes have been parsed.
            Go to the <strong>Home</strong> tab to run resume skill extraction.
          </p>
        </div>
      )}

      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <BraniacRunCard
        accountStatuses={accountStatuses}
        isRunning={isRunning}
        currentJobId={currentJobId}
        batchProgress={batchProgress}
        onRun={handleRun}
        onRunAll={handleRunAll}
        onRunMulti={handleRunMulti}
        onCancel={handleCancel}
        onCancelBatch={handleCancelBatch}
      />

      {isRunning && !progress && (
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-sm text-muted">
            <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            Starting analysis…
          </div>
        </div>
      )}

      {isRunning && progress && (
        <div className="glass-panel p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary font-medium">
              {progress.phase === 'analyzing'
                ? progress.totalBatches > 1
                  ? `Analyzing positions ${progress.positionsProcessed + 1}–${Math.min(progress.positionsProcessed + Math.ceil(progress.totalPositions / progress.totalBatches), progress.totalPositions)} of ${progress.totalPositions}`
                  : `Analyzing ${progress.totalPositions} position${progress.totalPositions === 1 ? '' : 's'}…`
                : progress.phase === 'synthesizing'
                ? 'Synthesizing final patterns…'
                : progress.phase === 'persisting'
                ? 'Saving patterns & profiles…'
                : progress.phase === 'aggregating'
                ? 'Aggregating data…'
                : 'Processing…'}
            </span>
            <span className="text-muted text-xs">{progress.progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progress.progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            {progress.totalBatches > 1 ? (
              <span>Batch {progress.batch} of {progress.totalBatches}</span>
            ) : (
              <span>{progress.phase}</span>
            )}
            <span>{progress.positionsProcessed} / {progress.totalPositions} positions</span>
          </div>
        </div>
      )}

      {isRunning && (
        <AgentStepStream agentId="braniac" agentName="Braniac" maxBubbles={8} />
      )}

    </div>
  )
}
